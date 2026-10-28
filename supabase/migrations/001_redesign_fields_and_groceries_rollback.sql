-- Rollback for 001_redesign_fields_and_groceries. Back up first: this deletes the grocery list
-- and the new recipe fields (photos, authors, sources, descriptions, times cooked).
--
-- The "photos" storage bucket is not dropped here: Supabase only lets you delete stored files
-- through the Storage API. Empty and delete it in the dashboard if you want it gone too.

begin;

drop function if exists public.clear_groceries(boolean);
drop function if exists public.set_grocery_checked(uuid, boolean);
drop function if exists public.add_groceries(text[], uuid);
drop function if exists public.record_cooked(uuid);

drop table if exists public.grocery_items;

-- save_recipe as it was in 000 (it must not reference the columns dropped below).
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
                       source, original_file_path, handwriting_path)
  values (
    rid,
    new_slug,
    trim(payload ->> 'title'),
    (payload ->> 'servings')::integer,
    (payload ->> 'prepMin')::integer,
    (payload ->> 'cookMin')::integer,
    coalesce(payload ->> 'category', 'more'),
    array(select jsonb_array_elements_text(coalesce(payload -> 'tags', '[]'))),
    payload ->> 'notes',
    coalesce(payload ->> 'source', 'typed'),
    payload ->> 'originalFilePath',
    payload ->> 'handwritingPath'
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
    deleted_at         = null;

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
         notes)), 'C')
  where id = rid
  returning * into r;

  return r;
end;
$$;

alter table public.recipes
  drop column if exists imported,
  drop column if exists times_cooked,
  drop column if exists description,
  drop column if exists photo_path,
  drop column if exists source_url,
  drop column if exists source_name,
  drop column if exists author;

commit;
