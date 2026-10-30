import type { Recipe } from "./types";

// The whole recipe as save_recipe expects it (a save replaces the recipe and all its parts).
export function recipePayload(recipe: Recipe) {
  return {
    id: recipe.id,
    title: recipe.title,
    servings: recipe.servings,
    prepMin: recipe.prepMin,
    cookMin: recipe.cookMin,
    category: recipe.category,
    tags: recipe.tags,
    notes: recipe.notes ?? "",
    source: recipe.source,
    originalFilePath: recipe.originalFilePath,
    handwritingPath: recipe.handwritingPath,
    author: recipe.author ?? "",
    sourceName: recipe.sourceName ?? "",
    sourceUrl: recipe.sourceUrl ?? "",
    description: recipe.description ?? "",
    photoPath: recipe.photoPath ?? null,
    imported: recipe.imported,
    ingredientGroups: recipe.ingredientGroups,
    stepGroups: recipe.stepGroups,
  };
}
