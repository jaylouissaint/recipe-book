-- Rollback for 003_live_updates: pages stop hearing about changes (they still refresh when
-- reopened or brought back to the front). No data is touched.

alter publication supabase_realtime drop table public.recipes, public.grocery_items, public.meal_plan;
