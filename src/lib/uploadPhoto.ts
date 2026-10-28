import { photoUploadUrl } from "@/app/actions";

// Uploads a recipe's cover photo straight to the "photos" bucket with a one-time signed link
// from save-recipe, and returns the path to save on the recipe.
export async function uploadPhoto(recipeId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || file.type.split("/").pop() || "jpg").toLowerCase();
  const link = await photoUploadUrl(recipeId, ext === "jpeg" ? "jpg" : ext);
  if (!link.ok) throw new Error(link.error);
  const { supabase } = await import("@/lib/supabase"); // only needed for uploads
  const { error } = await supabase.storage.from("photos").uploadToSignedUrl(link.path, link.token, file, {
    contentType: file.type || undefined,
  });
  if (error) throw new Error(`The photo didn't upload: ${error.message}`);
  return link.path;
}

// The whole recipe as save_recipe expects it (a save replaces the recipe and all its parts).
export function recipePayload(recipe: import("./types").Recipe) {
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
