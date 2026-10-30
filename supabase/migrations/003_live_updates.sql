-- 003_live_updates
-- Instant refresh on every open device (docs/DESIGN.md "Live updates"): Supabase Realtime tells
-- open pages when a recipe, the grocery list or the week's meals change, and they reload their
-- data. Realtime only sends changes for tables in the supabase_realtime publication, and only to
-- those allowed to read them (everyone can read these, as before). Nothing else changes.
-- Undo with 003_live_updates_rollback.sql.

alter publication supabase_realtime add table public.recipes, public.grocery_items, public.meal_plan;
