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
  id: string;
  title: string;
  servings: number | null;
  prepMin: number | null;
  cookMin: number | null;
  category: string; // a category slug from categories.ts
  tags: string[]; // tag ids from tags.ts
  ingredientGroups: IngredientGroup[];
  stepGroups: StepGroup[];
  notes?: string;
  source: "typed" | "scribble" | "upload";
};
