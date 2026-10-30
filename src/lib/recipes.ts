import { supabase } from "./supabase";
import type { BookId } from "./books";
import type { Recipe } from "./types";

// One query fetches a recipe with its groups, ingredients and steps. "*" rather than a column
// list, so the site keeps working whichever migrations have run (newer columns default below).
const SELECT = `
  *,
  ingredient_groups ( name, position, ingredients ( quantity, unit, item, position ) ),
  step_groups ( title, position, steps ( text, position ) )
`;

type Row = {
  id: string;
  slug: string;
  title: string;
  servings: number | null;
  prep_min: number | null;
  cook_min: number | null;
  category: string;
  tags: string[];
  notes: string | null;
  source: Recipe["source"];
  original_file_path: string | null;
  handwriting_path: string | null;
  created_at: string;
  author?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  photo_path?: string | null;
  description?: string | null;
  times_cooked?: number;
  last_cooked_at?: string | null;
  imported?: boolean;
  ingredient_groups: {
    name: string;
    position: number;
    ingredients: { quantity: string; unit: string; item: string; position: number }[];
  }[];
  step_groups: { title: string; position: number; steps: { text: string; position: number }[] }[];
};

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

function toRecipe(row: Row): Recipe {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    servings: row.servings,
    prepMin: row.prep_min,
    cookMin: row.cook_min,
    category: row.category,
    tags: row.tags,
    notes: row.notes ?? undefined,
    source: row.source,
    originalFilePath: row.original_file_path ?? undefined,
    handwritingPath: row.handwriting_path ?? undefined,
    createdAt: row.created_at,
    author: row.author ?? undefined,
    sourceName: row.source_name ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    photoPath: row.photo_path ?? undefined,
    description: row.description ?? undefined,
    timesCooked: row.times_cooked ?? 0,
    lastCookedAt: row.last_cooked_at ?? undefined,
    imported: row.imported ?? false,
    ingredientGroups: [...row.ingredient_groups].sort(byPosition).map((g) => ({
      name: g.name,
      items: [...g.ingredients].sort(byPosition).map(({ quantity, unit, item }) => ({ quantity, unit, item })),
    })),
    stepGroups: [...row.step_groups].sort(byPosition).map((g) => ({
      title: g.title,
      steps: [...g.steps].sort(byPosition).map((s) => s.text),
    })),
  };
}

// One book's recipes (migration 004 gave every recipe a book).
export async function listRecipes(book: BookId, category?: string): Promise<Recipe[]> {
  let query = supabase.from("recipes").select(SELECT).eq("book", book).is("deleted_at", null).order("title");
  if (category) query = query.eq("category", category);
  const { data, error } = await query.returns<Row[]>();
  if (error) throw new Error(`Loading recipes failed: ${error.message}`);
  return data.map(toRecipe);
}

export async function getRecipeById(book: BookId, id: string): Promise<Recipe | undefined> {
  const { data, error } = await supabase
    .from("recipes")
    .select(SELECT)
    .eq("book", book)
    .eq("id", id)
    .is("deleted_at", null)
    .returns<Row[]>()
    .maybeSingle();
  if (error) throw new Error(`Loading the recipe failed: ${error.message}`);
  return data ? toRecipe(data) : undefined;
}

export async function getRecipe(book: BookId, slug: string): Promise<Recipe | undefined> {
  const { data, error } = await supabase
    .from("recipes")
    .select(SELECT)
    .eq("book", book)
    .eq("slug", slug)
    .is("deleted_at", null)
    .returns<Row[]>()
    .maybeSingle();
  if (error) throw new Error(`Loading recipe "${slug}" failed: ${error.message}`);
  return data ? toRecipe(data) : undefined;
}
