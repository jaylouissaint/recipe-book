"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { GroceryItem } from "@/lib/groceries";
import type { Meal } from "@/lib/plan";
import { FetchError, decodeText, safeFetch } from "@/lib/safeFetch";
import { type WebRecipe, recipeFromHtml } from "@/lib/schemaRecipe";
import { FLAG_COOKIE, KEY_COOKIE, WriteError, callSaveRecipe } from "@/lib/write";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const YEAR = 60 * 60 * 24 * 365;
const cookieBase = {
  path: "/",
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: YEAR,
};

function failure(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof WriteError ? e.message : "Something went wrong. Please try again." };
}

// Every page can show a changed recipe (Home strips, Library, categories), so refresh them all.
function refreshPages() {
  revalidatePath("/", "layout");
}

export async function unlockEditing(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const key = String(form.get("key") ?? "").trim();
  if (!key) return { ok: false, error: "Paste your write key." };
  try {
    await callSaveRecipe({ action: "check" }, key);
  } catch (e) {
    if (e instanceof WriteError && e.status === 401) {
      await new Promise((r) => setTimeout(r, 1000)); // slow down guessing
      return { ok: false, error: "That write key isn't right." };
    }
    return failure(e);
  }
  const jar = await cookies();
  jar.set(KEY_COOKIE, key, { ...cookieBase, httpOnly: true });
  jar.set(FLAG_COOKIE, "1", { ...cookieBase, httpOnly: false });
  return { ok: true };
}

export async function lockEditing(): Promise<void> {
  const jar = await cookies();
  jar.delete(KEY_COOKIE);
  jar.delete(FLAG_COOKIE);
}

export async function saveRecipe(recipe: Record<string, unknown>): Promise<ActionResult<{ slug: string }>> {
  try {
    const { recipe: saved } = await callSaveRecipe<{ recipe: { slug: string } }>({ action: "save", recipe });
    refreshPages();
    return { ok: true, slug: saved.slug };
  } catch (e) {
    return failure(e);
  }
}

export async function deleteRecipe(id: string): Promise<ActionResult> {
  try {
    await callSaveRecipe({ action: "delete", id });
    refreshPages();
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

// A one-time signed link the browser uploads one file to directly: a cover photo, the original
// photo or PDF of a recipe added from photos, or the Pencil page.
export async function fileUploadUrl(
  bucket: "photos" | "originals" | "handwriting",
  recipeId: string,
  ext: string,
): Promise<ActionResult<{ path: string; token: string }>> {
  try {
    const { path, token } = await callSaveRecipe<{ path: string; token: string }>({
      action: "upload-url",
      bucket,
      recipeId,
      ext,
    });
    return { ok: true, path, token };
  } catch (e) {
    return failure(e);
  }
}

// Save from the web: reads the recipe a site publishes for search engines (schema.org).
// Unlocked devices only, so the website can't be used to fetch pages for anyone else.
export async function importFromWeb(
  link: string,
): Promise<ActionResult<{ recipe: WebRecipe; url: string }> & { url?: string }> {
  const url = /^[a-z][a-z0-9+.-]*:/i.test(link.trim()) ? link.trim() : `https://${link.trim()}`;
  try {
    await callSaveRecipe({ action: "check" });
    const page = await safeFetch(url, { accept: "text/html,application/xhtml+xml", maxBytes: 5_000_000 });
    if (!/html|xml|^$/i.test(page.contentType)) return { ok: false, error: "That link isn't a web page." };
    return { ok: true, recipe: recipeFromHtml(decodeText(page.body, page.contentType), page.url), url: page.url };
  } catch (e) {
    // The page couldn't be read, but the link is fine: the recipe can still be pasted in.
    if (e instanceof FetchError) return { ok: false, error: e.message, url: e.reached ? url : undefined };
    return failure(e);
  }
}

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Copies an imported recipe's photo from the website into the photos bucket, when it's saved.
export async function copyWebPhoto(recipeId: string, imageUrl: string): Promise<ActionResult<{ path: string }>> {
  try {
    const image = await safeFetch(imageUrl, { accept: "image/jpeg,image/png,image/webp", maxBytes: 10_000_000 });
    const type = image.contentType.split(";")[0].trim().toLowerCase();
    const ext = PHOTO_TYPES[type];
    if (!ext) return { ok: false, error: "The website's photo is in a format that can't be saved. Remove it or add your own." };
    const { path, token } = await callSaveRecipe<{ path: string; token: string }>({
      action: "upload-url",
      bucket: "photos",
      recipeId,
      ext,
    });
    const { supabase } = await import("@/lib/supabase");
    const { error } = await supabase.storage
      .from("photos")
      .uploadToSignedUrl(path, token, new Blob([image.body as BlobPart], { type }), { contentType: type });
    if (error) return { ok: false, error: `The website's photo didn't save: ${error.message}` };
    return { ok: true, path };
  } catch (e) {
    if (e instanceof FetchError) return { ok: false, error: `The website's photo couldn't be copied. ${e.message}` };
    return failure(e);
  }
}

// ---- in the kitchen (website step R4)

// "Start Cooking" reached the end, or "Mark as cooked" in the recipe menu.
export async function recordCooked(id: string): Promise<ActionResult<{ timesCooked: number }>> {
  try {
    const { timesCooked } = await callSaveRecipe<{ timesCooked: number }>({ action: "cooked", id });
    refreshPages();
    return { ok: true, timesCooked };
  } catch (e) {
    return failure(e);
  }
}

type GroceryRow = { id: string; text: string; checked: boolean };

// The list shows on Groceries and on Home's grocery card; both are cached pages, refreshed on
// every change (other open devices hear about it through live updates).
function refreshGroceries() {
  revalidatePath("/groceries");
  revalidatePath("/");
}

// Adds lines to the end of the list; `recipeId` links them to the recipe they came from.
export async function addGroceries(
  items: string[],
  recipeId?: string,
): Promise<ActionResult<{ items: Pick<GroceryItem, "id" | "text" | "checked">[] }>> {
  try {
    const { items: added } = await callSaveRecipe<{ items: GroceryRow[] }>({
      action: "groceries-add",
      items,
      recipeId: recipeId ?? null,
    });
    refreshGroceries();
    return { ok: true, items: added.map(({ id, text, checked }) => ({ id, text, checked })) };
  } catch (e) {
    return failure(e);
  }
}

export async function checkGrocery(id: string, checked: boolean): Promise<ActionResult> {
  try {
    await callSaveRecipe({ action: "grocery-check", id, checked });
    refreshGroceries();
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

// onlyChecked: "Clear checked"; otherwise "Clear all".
export async function clearGroceries(onlyChecked: boolean): Promise<ActionResult<{ removed: number }>> {
  try {
    const { removed } = await callSaveRecipe<{ removed: number }>({ action: "groceries-clear", onlyChecked });
    refreshGroceries();
    return { ok: true, removed };
  } catch (e) {
    return failure(e);
  }
}

// ---- this week's meals (Home)

export async function addMeal(meal: { day: string; recipeId?: string; note?: string; servings?: number }): Promise<ActionResult<{ meal: Meal }>> {
  try {
    const { meal: row } = await callSaveRecipe<{ meal: { id: string; day: string; recipe_id: string | null; note: string | null; servings: number | null } }>({
      action: "plan-add",
      day: meal.day,
      recipeId: meal.recipeId ?? null,
      note: meal.note ?? null,
      servings: meal.servings ?? null,
    });
    revalidatePath("/");
    return { ok: true, meal: { id: row.id, day: row.day, recipeId: row.recipe_id, note: row.note ?? "", servings: row.servings } };
  } catch (e) {
    return failure(e);
  }
}

export async function removeMeal(id: string): Promise<ActionResult> {
  try {
    await callSaveRecipe({ action: "plan-remove", id });
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}
