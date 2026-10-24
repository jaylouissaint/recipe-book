import type { Recipe } from "./types";

// Hard-coded until Supabase is wired up (milestone 1/3). Same shape the database will return.
const RECIPES: Recipe[] = [
  {
    id: "sweet-chili-chicken",
    title: "sweet chili chicken with coconut lime drizzle",
    servings: 4,
    prepMin: 45,
    cookMin: 15,
    category: "mains",
    tags: ["family-favorite"],
    source: "typed",
    ingredientGroups: [
      {
        name: "marinade",
        items: [
          { quantity: "2", unit: "lbs", item: "chicken thighs" },
          { quantity: "1/3", unit: "c", item: "sweet chili sauce" },
          { quantity: "2", unit: "TB", item: "soy sauce" },
          { quantity: "1", unit: "TB", item: "sesame oil" },
          { quantity: "2", unit: "", item: "garlic cloves (minced)" },
          { quantity: "1", unit: "tsp", item: "grated fresh ginger" },
          { quantity: "1", unit: "TB", item: "lime juice" },
        ],
      },
      {
        name: "coconut lime drizzle",
        items: [
          { quantity: "1/2", unit: "c", item: "canned coconut milk" },
          { quantity: "2", unit: "TB", item: "mayo" },
          { quantity: "1", unit: "TB", item: "lime juice" },
          { quantity: "1", unit: "tsp", item: "lime zest" },
          { quantity: "1", unit: "TB", item: "sriracha" },
          { quantity: "", unit: "", item: "pinch of salt" },
        ],
      },
      {
        name: "",
        items: [{ quantity: "2", unit: "c", item: "cooked rice" }],
      },
    ],
    stepGroups: [
      { title: "marinate chicken at least 30 min", steps: [] },
      {
        title: "make coconut lime drizzle",
        steps: [
          "whisk together coconut milk, mayo, lime juice, lime zest, sriracha, and a pinch of salt",
        ],
      },
      {
        title: "cook chicken",
        steps: [
          "heat grill pan over medium high heat",
          "lightly oil the surface",
          "grill marinated chicken 5-7 min per side",
          "let rest 5 min before slicing",
        ],
      },
      {
        title: "assemble the bowls",
        steps: [
          "top rice with chicken",
          "drizzle with coconut lime drizzle",
          "garnish with lime wedges",
        ],
      },
    ],
  },
];

export async function listRecipes(category?: string): Promise<Recipe[]> {
  return category ? RECIPES.filter((r) => r.category === category) : RECIPES;
}

export async function getRecipe(id: string): Promise<Recipe | undefined> {
  return RECIPES.find((r) => r.id === id);
}
