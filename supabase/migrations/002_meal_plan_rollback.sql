-- Rollback for 002_meal_plan. Deletes the week's meals; recipes and groceries are untouched.

begin;

drop function if exists public.plan_remove(uuid);
drop function if exists public.plan_add(date, uuid, text, integer);
drop table if exists public.meal_plan;

commit;
