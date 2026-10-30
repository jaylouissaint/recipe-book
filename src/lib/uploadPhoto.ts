import { fileUploadUrl } from "@/app/actions";
import type { BookId } from "./books";

// Uploads a file straight to a storage bucket with a one-time signed link from save-recipe,
// and returns the path to save on the recipe.
export async function uploadFile(book: BookId, bucket: "photos" | "originals" | "handwriting", recipeId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || file.type.split("/").pop() || "jpg").toLowerCase();
  const link = await fileUploadUrl(book, bucket, recipeId, ext === "jpeg" ? "jpg" : ext);
  if (!link.ok) throw new Error(link.error);
  const { supabase } = await import("@/lib/supabase"); // only needed for uploads
  const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(link.path, link.token, file, {
    contentType: file.type || undefined,
  });
  if (error) throw new Error(`The ${{ photos: "photo", originals: "original", handwriting: "handwritten page" }[bucket]} didn't upload: ${error.message}`);
  return link.path;
}

// The recipe's cover photo.
export function uploadPhoto(book: BookId, recipeId: string, file: File): Promise<string> {
  return uploadFile(book, "photos", recipeId, file);
}

export { recipePayload } from "./payload";
