-- 005_last_cooked
-- "Haven't made in a while" on Home (docs/DESIGN.md "Home"): when each recipe was last cooked.
-- Set whenever times cooked goes up (Start Cooking reaching the end, or Mark as cooked). Recipes
-- cooked before this have no date and count as "a while ago". Nothing else changes, and the
-- deployed site keeps working. Undo with 005_last_cooked_rollback.sql.

alter table public.recipes add column last_cooked_at timestamptz;

create or replace function public.record_cooked(rid uuid)
returns integer
language sql
set search_path = public
as $$
  update recipes set times_cooked = times_cooked + 1, last_cooked_at = now()
  where id = rid and deleted_at is null
  returning times_cooked;
$$;
-- create or replace keeps record_cooked's existing grants (service role only).
