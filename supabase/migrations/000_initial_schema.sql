-- 000_initial_schema
-- Recipe tables, read-only public access, the save_recipe/delete_recipe functions used by the
-- save-recipe Edge Function, storage buckets, and the sweet chili chicken seed recipe.
--
-- Run by hand in the Supabase SQL Editor (after a backup once there is data).
-- Undo with 000_initial_schema_rollback.sql.

begin;

-- ---------------------------------------------------------------- helpers

create function public.slugify(t text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(t), '[^a-z0-9]+', '-', 'g'))
$$;

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- tables

create table public.recipes (
  id                 uuid primary key default gen_random_uuid(), -- the app creates ids offline
  slug               text not null unique,                       -- website address: /recipe/<slug>
  title              text not null check (length(trim(title)) > 0),
  servings           integer check (servings > 0),
  prep_min           integer check (prep_min >= 0),
  cook_min           integer check (cook_min >= 0),
  category           text not null default 'more'
                     check (category in ('mains', 'sides', 'desserts', 'more')), -- CATEGORIES in src/lib/book.ts
  tags               text[] not null default '{}',              -- tag ids from TAGS in src/lib/book.ts
  notes              text,
  source             text not null default 'typed'
                     check (source in ('typed', 'scribble', 'pencil', 'scan', 'upload')),
  original_file_path text,                                       -- object in the "originals" bucket
  handwriting_path   text,                                       -- object in the "handwriting" bucket
  search             tsvector,                                   -- filled by save_recipe
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),         -- the app syncs rows changed since its last sync
  deleted_at         timestamptz                                 -- soft delete, so deletes sync to the app
);

create table public.ingredient_groups (
  id        uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  name      text not null default '', -- "marinade", or '' for loose items
  position  integer not null,
  unique (recipe_id, position)
);

create table public.ingredients (
  id       uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.ingredient_groups (id) on delete cascade,
  quantity text not null default '', -- as written: '1/3', '1 1/2', '' for "pinch of salt"
  unit     text not null default '', -- 'c', 'TB', 'tsp', 'lbs', ''
  item     text not null,
  position integer not null,
  unique (group_id, position)
);

create table public.step_groups (
  id        uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  title     text not null, -- the ▷ line
  position  integer not null,
  unique (recipe_id, position)
);

create table public.steps (
  id       uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.step_groups (id) on delete cascade,
  text     text not null, -- a "–" line
  position integer not null,
  unique (group_id, position)
);

create index recipes_updated_at_idx on public.recipes (updated_at);
create index recipes_category_idx on public.recipes (category) where deleted_at is null;
create index recipes_tags_idx on public.recipes using gin (tags);
create index recipes_search_idx on public.recipes using gin (search);
-- the unique (parent, position) constraints already index the foreign keys

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- access: anyone can read, nobody writes directly
-- Writes happen only through save_recipe/delete_recipe, called by the save-recipe Edge Function
-- with the service role (which bypasses RLS). There is no login yet (queued).

alter table public.recipes           enable row level security;
alter table public.ingredient_groups enable row level security;
alter table public.ingredients       enable row level security;
alter table public.step_groups       enable row level security;
alter table public.steps             enable row level security;

-- Deleted recipes stay readable so the app can see the delete; the website filters deleted_at is null.
create policy "public read" on public.recipes           for select to anon, authenticated using (true);
create policy "public read" on public.ingredient_groups for select to anon, authenticated using (true);
create policy "public read" on public.ingredients       for select to anon, authenticated using (true);
create policy "public read" on public.step_groups       for select to anon, authenticated using (true);
create policy "public read" on public.steps             for select to anon, authenticated using (true);

-- Belt and braces: no write privileges either, even if a policy is added by mistake.
revoke insert, update, delete, truncate
  on public.recipes, public.ingredient_groups, public.ingredients, public.step_groups, public.steps
  from anon, authenticated;

-- ---------------------------------------------------------------- save_recipe
-- Creates or replaces a whole recipe in one transaction. The payload uses the same field names
-- as the Recipe type in src/lib/types.ts:
--   { id?, slug?, title, servings, prepMin, cookMin, category, tags[], notes, source,
--     originalFilePath, handwritingPath,
--     ingredientGroups: [{ name, items: [{ quantity, unit, item }] }],
--     stepGroups: [{ title, steps: [text] }] }
-- On update the slug is kept unless one is passed, so the recipe's web address doesn't change
-- when its title does. Saving a deleted recipe restores it.

create function public.save_recipe(payload jsonb)
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

  -- Search covers the title (ranked highest), ingredients, then tags, steps and notes.
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

create function public.delete_recipe(rid uuid)
returns void
language sql
set search_path = public
as $$
  update recipes set deleted_at = now() where id = rid and deleted_at is null;
$$;

-- Only the service role (the Edge Function) may call the write functions.
revoke execute on function public.save_recipe(jsonb) from public, anon, authenticated;
revoke execute on function public.delete_recipe(uuid) from public, anon, authenticated;
grant execute on function public.save_recipe(jsonb) to service_role;
grant execute on function public.delete_recipe(uuid) to service_role;

-- Called twice a week by .github/workflows/keep-supabase-awake.yml so the free project doesn't pause.
create function public.keep_alive()
returns integer
language sql
stable
as $$
  select 1
$$;

grant execute on function public.keep_alive() to anon;

-- ---------------------------------------------------------------- storage
-- Public buckets: anyone with a file's link can view it. There are no upload policies, so
-- uploads only work through signed upload URLs handed out by the Edge Function.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('originals', 'originals', true, 20971520, -- 20 MB: scans, photos, PDFs
   array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf']),
  ('handwriting', 'handwriting', true, 10485760, -- 10 MB: rendered page PNG + PencilKit drawing data
   array['image/png', 'application/octet-stream'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------- seed

select public.save_recipe($json$
{
  "id": "5c1e0a3e-7d4b-4c55-9a51-2f3b6c1d0001",
  "slug": "sweet-chili-chicken",
  "title": "sweet chili chicken with coconut lime drizzle",
  "servings": 4,
  "prepMin": 45,
  "cookMin": 15,
  "category": "mains",
  "tags": ["family-favorite"],
  "source": "typed",
  "ingredientGroups": [
    { "name": "marinade", "items": [
      { "quantity": "2",   "unit": "lbs", "item": "chicken thighs" },
      { "quantity": "1/3", "unit": "c",   "item": "sweet chili sauce" },
      { "quantity": "2",   "unit": "TB",  "item": "soy sauce" },
      { "quantity": "1",   "unit": "TB",  "item": "sesame oil" },
      { "quantity": "2",   "unit": "",    "item": "garlic cloves (minced)" },
      { "quantity": "1",   "unit": "tsp", "item": "grated fresh ginger" },
      { "quantity": "1",   "unit": "TB",  "item": "lime juice" }
    ]},
    { "name": "coconut lime drizzle", "items": [
      { "quantity": "1/2", "unit": "c",   "item": "canned coconut milk" },
      { "quantity": "2",   "unit": "TB",  "item": "mayo" },
      { "quantity": "1",   "unit": "TB",  "item": "lime juice" },
      { "quantity": "1",   "unit": "tsp", "item": "lime zest" },
      { "quantity": "1",   "unit": "TB",  "item": "sriracha" },
      { "quantity": "",    "unit": "",    "item": "pinch of salt" }
    ]},
    { "name": "", "items": [
      { "quantity": "2", "unit": "c", "item": "cooked rice" }
    ]}
  ],
  "stepGroups": [
    { "title": "marinate chicken at least 30 min", "steps": [] },
    { "title": "make coconut lime drizzle", "steps": [
      "whisk together coconut milk, mayo, lime juice, lime zest, sriracha, and a pinch of salt"
    ]},
    { "title": "cook chicken", "steps": [
      "heat grill pan over medium high heat",
      "lightly oil the surface",
      "grill marinated chicken 5-7 min per side",
      "let rest 5 min before slicing"
    ]},
    { "title": "assemble the bowls", "steps": [
      "top rice with chicken",
      "drizzle with coconut lime drizzle",
      "garnish with lime wedges"
    ]}
  ]
}
$json$::jsonb);

commit;
