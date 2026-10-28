-- 001_redesign_fields_and_groceries
-- Fields for the redesign (docs/DESIGN.md): photo, author, source, description, times cooked and
-- the "Check this import" flag; the grocery list; the photos bucket; save_recipe updated for the
-- new fields; write functions for groceries and times cooked.
--
-- Run by hand in the Supabase SQL Editor after a backup. Undo with
-- 001_redesign_fields_and_groceries_rollback.sql.

begin;

-- ---------------------------------------------------------------- recipe fields

alter table public.recipes
  add column author       text,
  add column source_name  text,                -- "Smitten Kitchen", "Nothing Fancy"
  add column source_url   text,                -- the page a web import came from
  add column photo_path   text,                -- object in the "photos" bucket
  add column description  text,
  add column times_cooked integer not null default 0 check (times_cooked >= 0),
  add column imported     boolean not null default false; -- shows "Check this import" until edited

-- ---------------------------------------------------------------- grocery list

create table public.grocery_items (
  id         uuid primary key default gen_random_uuid(),
  text       text not null check (length(trim(text)) > 0), -- as it should read on the list
  recipe_id  uuid references public.recipes (id) on delete set null,
  checked    boolean not null default false,
  position   integer not null,
  created_at timestamptz not null default now()
);

create index grocery_items_position_idx on public.grocery_items (position);

alter table public.grocery_items enable row level security;
create policy "public read" on public.grocery_items for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.grocery_items from anon, authenticated;

-- ---------------------------------------------------------------- save_recipe with the new fields
-- Same as 000, plus author, sourceName, sourceUrl, photoPath, description and imported.
-- times_cooked is never set by a save (see record_cooked).

create or replace function public.save_recipe(payload jsonb)
returns public.recipes
language plpgsql
set search_path = public
as $$
declare
  rid      uuid := coalesce((payload ->> 'id')::uuid, gen_random_uuid());
  new_slug text := coalesce(nullif(payload ->> 'slug', ''), slugify(payload ->> 'title'));
  g        jsonb;
  g_pos    bigint;
  gid      uuid;
  r        recipes;
begin
  if coalesce(trim(payload ->> 'title'), '') = '' then
    raise exception 'title is required';
  end if;

  if new_slug = '' or exists (select 1 from recipes where slug = new_slug and id <> rid) then
    new_slug := concat_ws('-', nullif(new_slug, ''), left(rid::text, 8));
  end if;

  insert into recipes (id, slug, title, servings, prep_min, cook_min, category, tags, notes,
                       source, original_file_path, handwriting_path,
                       author, source_name, source_url, photo_path, description, imported)
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
    coalesce((payload ->> 'imported')::boolean, false)
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

-- ---------------------------------------------------------------- times cooked

create function public.record_cooked(rid uuid)
returns integer
language sql
set search_path = public
as $$
  update recipes set times_cooked = times_cooked + 1 where id = rid and deleted_at is null
  returning times_cooked;
$$;

-- ---------------------------------------------------------------- grocery write functions

-- Adds lines to the end of the list, optionally linked to the recipe they came from.
create function public.add_groceries(items text[], rid uuid default null)
returns setof public.grocery_items
language sql
set search_path = public
as $$
  insert into grocery_items (text, recipe_id, position)
  select trim(t), rid, coalesce((select max(position) from grocery_items), 0) + n
  from unnest(items) with ordinality as u (t, n)
  where length(trim(t)) > 0
  returning *;
$$;

create function public.set_grocery_checked(item_id uuid, is_checked boolean)
returns void
language sql
set search_path = public
as $$
  update grocery_items set checked = is_checked where id = item_id;
$$;

-- only_checked = true is "Clear checked"; false is "Clear all".
create function public.clear_groceries(only_checked boolean)
returns integer
language sql
set search_path = public
as $$
  with gone as (delete from grocery_items where checked or not only_checked returning 1)
  select count(*)::integer from gone;
$$;

-- Only the service role (the save-recipe Edge Function) may call the write functions.
revoke execute on function public.record_cooked(uuid) from public, anon, authenticated;
revoke execute on function public.add_groceries(text[], uuid) from public, anon, authenticated;
revoke execute on function public.set_grocery_checked(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.clear_groceries(boolean) from public, anon, authenticated;
grant execute on function public.record_cooked(uuid) to service_role;
grant execute on function public.add_groceries(text[], uuid) to service_role;
grant execute on function public.set_grocery_checked(uuid, boolean) to service_role;
grant execute on function public.clear_groceries(boolean) to service_role;
-- create or replace keeps save_recipe's existing grants (service role only).

-- ---------------------------------------------------------------- photos bucket

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, -- 10 MB
        array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'])
on conflict (id) do nothing;

commit;
