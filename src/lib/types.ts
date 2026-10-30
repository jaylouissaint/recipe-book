export type Ingredient = {
  quantity: string; // as written, e.g. "1/3", "2", "" for "pinch of salt"
  unit: string; // "c", "TB", "tsp", "lbs", ""
  item: string;
};

export type IngredientGroup = {
  name: string; // "marinade", "coconut lime drizzle", or "" for loose items
  items: Ingredient[];
};

export type StepGroup = {
  title: string; // the ▷ line, e.g. "cook chicken"
  steps: string[]; // the "–" lines under it
};

export type Recipe = {
  id: string; // uuid
  slug: string; // web address: /recipe/<slug>
  title: string;
  servings: number | null;
  prepMin: number | null;
  cookMin: number | null;
  category: string; // a category slug from book.ts
  tags: string[]; // tag ids from book.ts
  ingredientGroups: IngredientGroup[];
  stepGroups: StepGroup[];
  notes?: string;
  source: "typed" | "scribble" | "pencil" | "scan" | "upload";
  originalFilePath?: string; // in the "originals" storage bucket
  handwritingPath?: string; // in the "handwriting" storage bucket
  createdAt: string;
  author?: string;
  sourceName?: string; // "Smitten Kitchen", a cookbook title
  sourceUrl?: string; // the page a web import came from
  photoPath?: string; // in the "photos" storage bucket
  description?: string;
  timesCooked: number;
  lastCookedAt?: string; // when Start Cooking last reached the end or Mark as cooked was tapped (migration 005)
  imported: boolean; // shows "Check this import" until edited and saved
};
