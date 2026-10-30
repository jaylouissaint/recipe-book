import type { BookId } from "./books";
import { supabase } from "./supabase";

// The grocery list (docs/DESIGN.md "Groceries"): one list, in the order things were added.
export type GroceryItem = {
  id: string;
  text: string;
  checked: boolean;
  recipe: { id: string; slug: string; title: string; photoPath?: string } | null;
};

type Row = {
  id: string;
  text: string;
  checked: boolean;
  recipes: { id: string; slug: string; title: string; photo_path: string | null } | null;
};

export async function listGroceries(book: BookId): Promise<GroceryItem[]> {
  const { data, error } = await supabase
    .from("grocery_items")
    .select("id, text, checked, position, recipes ( id, slug, title, photo_path )")
    .eq("book", book)
    .order("position");
  if (error) throw new Error(`Couldn't load the grocery list: ${error.message}`);
  return (data as unknown as Row[]).map((r) => ({
    id: r.id,
    text: r.text,
    checked: r.checked,
    recipe: r.recipes
      ? { id: r.recipes.id, slug: r.recipes.slug, title: r.recipes.title, photoPath: r.recipes.photo_path ?? undefined }
      : null,
  }));
}
