-- 004_books
-- A second book (docs/HANDOFF.md "Who's using this"): Ramiya's and Jay's recipes, groceries and
-- week, side by side. Every row gets a book; everything that exists now is Ramiya's. The
-- save-recipe Edge Function works out the book from the write key and only changes that book
-- (WRITE_KEY is Ramiya's, WRITE_KEY_JAY is Jay's). The write functions take the book, defaulting to
-- Ramiya's, so the previous version of save-recipe keeps working until it's redeployed.
-- Undo with 004_books_rollback.sql.

alter table public.recipes       add column book text not null default 'ramiya' check (book in ('ramiya', 'jay'));
alter table public.grocery_items add column book text not null default 'ramiya' check (book in ('ramiya', 'jay'));
alter table public.meal_plan     add column book text not null default 'ramiya' check (book in ('ramiya', 'jay'));

create index recipes_book_idx       on public.recipes (book);
create index grocery_items_book_idx on public.grocery_items (book, position);
create index meal_plan_book_idx     on public.meal_plan (book, day, position);

-- ---------------------------------------------------------------- save_recipe with the book
-- As in 001, plus payload.book (default Ramiya's); a recipe can't move to the other book.
create or replace function public.save_recipe(payload jsonb)
returns public.recipes
language plpgsql
set search_path = public
as $$
declare
  rid      uuid := coalesce((payload ->> 'id')::uuid, gen_random_uuid());
  bk       text := coalesce(nullif(payload ->> 'book', ''), 'ramiya');
  new_slug text := coalesce(nullif(payload ->> 'slug', ''), slugify(payload ->> 'title'));
  g        jsonb;
  g_pos    bigint;
  gid      uuid;
  r        recipes;
begin
  if coalesce(trim(payload ->> 'title'), '') = '' then
    raise exception 'title is required';
  end if;

  -- A recipe stays in the book it was made in.
  if exists (select 1 from recipes where id = rid and book <> bk) then
    raise exception 'that recipe is in the other book';
  end if;

  if new_slug = '' or exists (select 1 from recipes where slug = new_slug and id <> rid) then
    new_slug := concat_ws('-', nullif(new_slug, ''), left(rid::text, 8));
  end if;

  insert into recipes (id, slug, title, servings, prep_min, cook_min, category, tags, notes,
                       source, original_file_path, handwriting_path,
                       author, source_name, source_url, photo_path, description, imported, book)
  values (
    rid,
    new_slug,
    trim(payload ->> 'title'),
    (payload ->> 'servings')::integer,
    (payload ->> 'prepMin')::integer,
    (payload ->> 'cookMin')::integer,
    coalesce(payload ->> 'category', 'more'),
    array(select jsonb_array_elements_text(coalesce(payload -> 'tags', '[]'))),
    nullif(payload ->> 'notes', ''),
    coalesce(payload ->> 'source', 'typed'),
    payload ->> 'originalFilePath',
    payload ->> 'handwritingPath',
    nullif(trim(payload ->> 'author'), ''),
    nullif(trim(payload ->> 'sourceName'), ''),
    nullif(trim(payload ->> 'sourceUrl'), ''),
    payload ->> 'photoPath',
    nullif(payload ->> 'description', ''),
    coalesce((payload ->> 'imported')::boolean, false),
    bk
  )
  on conflict (id) do update set
    slug               = case when coalesce(payload ->> 'slug', '') <> '' then excluded.slug
                              else recipes.slug end,
    title              = excluded.title,
    servings           = excluded.servings,
    prep_min           = excluded.prep_min,
    cook_min           = excluded.cook_min,
    category           = excluded.category,
    tags               = excluded.tags,
    notes              = excluded.notes,
    source             = excluded.source,
    original_file_path = excluded.original_file_path,
    handwriting_path   = excluded.handwriting_path,
    author             = excluded.author,
    source_name        = excluded.source_name,
    source_url         = excluded.source_url,
    photo_path         = excluded.photo_path,
    description        = excluded.description,
    imported           = excluded.imported,
    deleted_at         = null;

  -- Replace the children (deleting groups cascades to their items and steps).
  delete from ingredient_groups where recipe_id = rid;
  delete from step_groups where recipe_id = rid;

  for g, g_pos in
    select value, ordinality
    from jsonb_array_elements(coalesce(payload -> 'ingredientGroups', '[]')) with ordinality
  loop
    insert into ingredient_groups (recipe_id, name, position)
    values (rid, coalesce(g ->> 'name', ''), g_pos)
    returning id into gid;

    insert into ingredients (group_id, quantity, unit, item, position)
    select gid, coalesce(i ->> 'quantity', ''), coalesce(i ->> 'unit', ''), i ->> 'item', n
    from jsonb_array_elements(coalesce(g -> 'items', '[]')) with ordinality as t (i, n);
  end loop;

  for g, g_pos in
    select value, ordinality
    from jsonb_array_elements(coalesce(payload -> 'stepGroups', '[]')) with ordinality
  loop
    insert into step_groups (recipe_id, title, position)
    values (rid, g ->> 'title', g_pos)
    returning id into gid;

    insert into steps (group_id, text, position)
    select gid, s, n
    from jsonb_array_elements_text(coalesce(g -> 'steps', '[]')) with ordinality as t (s, n);
  end loop;

  -- Search covers the title (ranked highest), ingredients, then tags, steps, notes, author,
  -- source and description.
  update recipes set search =
       setweight(to_tsvector('english', title), 'A')
    || setweight(to_tsvector('english', coalesce((
         select string_agg(i.item, ' ')
         from ingredient_groups ig join ingredients i on i.group_id = ig.id
         where ig.recipe_id = rid), '')), 'B')
    || setweight(to_tsvector('english', concat_ws(' ',
         replace(array_to_string(tags, ' '), '-', ' '),
         (select string_agg(concat_ws(' ', sg.title, (
                   select string_agg(s.text, ' ') from steps s where s.group_id = sg.id)), ' ')
          from step_groups sg where sg.recipe_id = rid),
         notes, author, source_name, description)), 'C')
  where id = rid
  returning * into r;

  return r;
end;
$$;

-- ---------------------------------------------------------------- grocery and meal functions with the book

drop function public.add_groceries(text[], uuid);
drop function public.clear_groceries(boolean);
drop function public.plan_add(date, uuid, text, integer);

-- Adds lines to the end of a book's list, optionally linked to the recipe they came from.
create function public.add_groceries(items text[], rid uuid default null, b text default 'ramiya')
returns setof public.grocery_items
language sql
set search_path = public
as $$
  insert into grocery_items (text, recipe_id, position, book)
  select trim(t), rid, coalesce((select max(position) from grocery_items where book = b), 0) + n, b
  from unnest(items) with ordinality as u (t, n)
  where length(trim(t)) > 0
  returning *;
$$;

-- only_checked = true is "Clear checked"; false is "Clear all". One book's list only.
create function public.clear_groceries(only_checked boolean, b text default 'ramiya')
returns integer
language sql
set search_path = public
as $$
  with gone as (delete from grocery_items where book = b and (checked or not only_checked) returning 1)
  select count(*)::integer from gone;
$$;

-- Adds a meal at the end of a day in a book. Days more than a month old are cleared out too.
create function public.plan_add(plan_day date, rid uuid default null, plan_note text default null,
                                plan_servings integer default null, b text default 'ramiya')
returns public.meal_plan
language sql
set search_path = public
as $$
  delete from meal_plan where day < current_date - 31;
  insert into meal_plan (day, recipe_id, note, servings, position, book)
  values (
    plan_day,
    rid,
    nullif(trim(plan_note), ''),
    plan_servings,
    coalesce((select max(position) from meal_plan where day = plan_day and book = b), 0) + 1,
    b
  )
  returning *;
$$;

-- Only the service role (the save-recipe Edge Function) may call the write functions.
revoke execute on function public.add_groceries(text[], uuid, text) from public, anon, authenticated;
revoke execute on function public.clear_groceries(boolean, text) from public, anon, authenticated;
revoke execute on function public.plan_add(date, uuid, text, integer, text) from public, anon, authenticated;
grant execute on function public.add_groceries(text[], uuid, text) to service_role;
grant execute on function public.clear_groceries(boolean, text) to service_role;
grant execute on function public.plan_add(date, uuid, text, integer, text) to service_role;
-- create or replace keeps save_recipe's existing grants (service role only).
