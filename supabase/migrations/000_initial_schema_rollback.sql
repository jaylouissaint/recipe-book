-- Rollback for 000_initial_schema. Deletes every recipe. Back up first.
--
-- Storage buckets are not dropped here: Supabase only lets you delete stored files through the
-- Storage API. Empty and delete the "originals" and "handwriting" buckets in the dashboard
-- (Storage -> bucket -> ... -> Delete bucket) if you want them gone too.

begin;

drop function if exists public.keep_alive();
drop function if exists public.delete_recipe(uuid);
drop function if exists public.save_recipe(jsonb);

drop table if exists public.steps;
drop table if exists public.step_groups;
drop table if exists public.ingredients;
drop table if exists public.ingredient_groups;
drop table if exists public.recipes;

drop function if exists public.set_updated_at();
drop function if exists public.slugify(text);

commit;
