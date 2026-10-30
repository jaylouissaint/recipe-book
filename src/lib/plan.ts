import type { BookId } from "./books";
import { supabase } from "./supabase";

// This week's meals on Home (docs/DESIGN.md "Home"): a recipe or a plain note on a day.
export type Meal = {
  id: string;
  day: string; // YYYY-MM-DD, the cook's own calendar day
  recipeId: string | null;
  note: string;
  servings: number | null; // null: the recipe's own servings
};

type Row = { id: string; day: string; recipe_id: string | null; note: string | null; servings: number | null };

// Meals from a few days back to a week and a bit ahead, covering any time zone; Home picks out
// today and the next 6 days. null when migration 002 hasn't been run yet.
export async function listMeals(book: BookId): Promise<Meal[] | null> {
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("meal_plan")
    .select("id, day, recipe_id, note, servings, position")
    .eq("book", book)
    .gte("day", day(-2))
    .lte("day", day(9))
    .order("day")
    .order("position");
  if (error) {
    if (/meal_plan|schema cache|does not exist/i.test(error.message)) return null;
    throw new Error(`Couldn't load this week's meals: ${error.message}`);
  }
  return (data as Row[]).map((r) => ({ id: r.id, day: r.day, recipeId: r.recipe_id, note: r.note ?? "", servings: r.servings }));
}
