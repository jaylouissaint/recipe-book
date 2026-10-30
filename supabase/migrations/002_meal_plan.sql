-- 002_meal_plan
-- This week's meals on Home (docs/DESIGN.md "Home"): a recipe, or a plain note like "leftovers",
-- on a day. Everyone can read it, like the rest of the book; only the save-recipe Edge Function
-- (actions plan-add and plan-remove) can change it. Undo with 002_meal_plan_rollback.sql.

create table public.meal_plan (
  id         uuid primary key default gen_random_uuid(),
  day        date not null,
  recipe_id  uuid references public.recipes (id) on delete cascade,
  note       text,
  servings   integer check (servings is null or servings between 1 and 100), -- null: the recipe's own
  position   integer not null,
  created_at timestamptz not null default now(),
  check (recipe_id is not null or length(trim(coalesce(note, ''))) > 0)
);

create index meal_plan_day_idx on public.meal_plan (day, position);

alter table public.meal_plan enable row level security;
create policy "public read" on public.meal_plan for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.meal_plan from anon, authenticated;

-- Adds a meal at the end of a day. Days more than a month old are cleared out at the same time,
-- so the table stays small.
create function public.plan_add(plan_day date, rid uuid default null, plan_note text default null, plan_servings integer default null)
returns public.meal_plan
language sql
set search_path = public
as $$
  delete from meal_plan where day < current_date - 31;
  insert into meal_plan (day, recipe_id, note, servings, position)
  values (
    plan_day,
    rid,
    nullif(trim(plan_note), ''),
    plan_servings,
    coalesce((select max(position) from meal_plan where day = plan_day), 0) + 1
  )
  returning *;
$$;

create function public.plan_remove(item_id uuid)
returns void
language sql
set search_path = public
as $$
  delete from meal_plan where id = item_id;
$$;

-- Only the service role (the save-recipe Edge Function) may call the write functions.
revoke execute on function public.plan_add(date, uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.plan_remove(uuid) from public, anon, authenticated;
grant execute on function public.plan_add(date, uuid, text, integer) to service_role;
grant execute on function public.plan_remove(uuid) to service_role;
