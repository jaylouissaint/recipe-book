import { fileUploadUrl } from "@/app/actions";

// Uploads a file straight to a storage bucket with a one-time signed link from save-recipe,
// and returns the path to save on the recipe.
export async function uploadFile(bucket: "photos" | "originals" | "handwriting", recipeId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || file.type.split("/").pop() || "jpg").toLowerCase();
  const link = await fileUploadUrl(bucket, recipeId, ext === "jpeg" ? "jpg" : ext);
  if (!link.ok) throw new Error(link.error);
  const { supabase } = await import("@/lib/supabase"); // only needed for uploads
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(link.path, link.token, file, {
    contentType: file.type || undefined,
  });
  if (error) throw new Error(`The ${{ photos: "photo", originals: "original", handwriting: "handwritten page" }[bucket]} didn't upload: ${error.message}`);
  return link.path;
}

// The recipe's cover photo.
export function uploadPhoto(recipeId: string, file: File): Promise<string> {
  return uploadFile("photos", recipeId, file);
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
