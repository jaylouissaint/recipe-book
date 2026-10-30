"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { GroceryItem } from "@/lib/groceries";
import type { Meal } from "@/lib/plan";
import { FetchError, decodeText, safeFetch } from "@/lib/safeFetch";
import { recipePayload } from "@/lib/payload";
import { getRecipeById } from "@/lib/recipes";
import { type WebRecipe, recipeFromHtml } from "@/lib/schemaRecipe";
import { FAVORITE } from "@/lib/book";
import { BOOKS, type BookId, isBook } from "@/lib/books";
import { WriteError, callSaveRecipe, flagCookie, keyCookie } from "@/lib/write";

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

// Every action is for one book (docs/HANDOFF.md "Who's using this"): its unlocked key is sent,
// and save-recipe only lets that key change that book.
function who(book: BookId) {
  if (!isBook(book)) throw new WriteError("Unknown book.", 400);
  return { book };
}

// Every page of the book can show a change (Home, Library, Groceries, the book view, recipes), so
// refresh them all; the pages live under /b/<book> (src/middleware.ts). Other open devices hear
// about changes through live updates.
function refreshBook(book: BookId) {
  revalidatePath(`/b/${book}`, "layout");
}

// Unlocks one book on this browser: the key must be that book's (save-recipe says whose it is).
export async function unlockEditing(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const book = form.get("book");
  const key = String(form.get("key") ?? "").trim();
  if (!isBook(book)) return { ok: false, error: "Unknown book." };
  if (!key) return { ok: false, error: "Paste the write key." };
  let keyBook: string;
  try {
    // A save-recipe from before the second book doesn't say whose key it is: that was Ramiya's.
    ({ book: keyBook = "ramiya" } = await callSaveRecipe<{ book?: string }>({ action: "check" }, { key }));
  } catch (e) {
    if (e instanceof WriteError && e.status === 401) {
      await new Promise((r) => setTimeout(r, 1000)); // slow down guessing
      return { ok: false, error: "That write key isn't right." };
    }
    return failure(e);
  }
  if (keyBook !== book) {
    const other = isBook(keyBook) ? BOOKS[keyBook].name : "the other book";
    return { ok: false, error: `That's the key for ${other}. Unlock it there instead.` };
  }
  const jar = await cookies();
  jar.set(keyCookie(book), key, { ...cookieBase, httpOnly: true });
  jar.set(flagCookie(book), "1", { ...cookieBase, httpOnly: false });
  return { ok: true };
}

export async function lockEditing(book: BookId): Promise<void> {
  if (!isBook(book)) return;
  const jar = await cookies();
  jar.delete(keyCookie(book));
  jar.delete(flagCookie(book));
}

export async function saveRecipe(book: BookId, recipe: Record<string, unknown>): Promise<ActionResult<{ slug: string }>> {
  try {
    const { recipe: saved } = await callSaveRecipe<{ recipe: { slug: string } }>({ action: "save", recipe }, who(book));
    refreshBook(book);
    return { ok: true, slug: saved.slug };
  } catch (e) {
    return failure(e);
  }
}

export async function deleteRecipe(book: BookId, id: string): Promise<ActionResult> {
  try {
    await callSaveRecipe({ action: "delete", id }, who(book));
    refreshBook(book);
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

// Copies a recipe into the other book, as a recipe of its own there (its photo, handwritten page and
// original are shared, not duplicated). Needs the other book's key on this device: the copy is
// saved with it. It starts with no times cooked and no favorite star.
export async function copyRecipe(from: BookId, to: BookId, id: string): Promise<ActionResult<{ slug: string }>> {
  try {
    if (!isBook(from) || !isBook(to) || from === to) throw new WriteError("Pick the other book to copy to.", 400);
    const recipe = await getRecipeById(from, id);
    if (!recipe) throw new WriteError("That recipe couldn't be found.", 404);
    const copy = {
      ...recipePayload(recipe),
      id: crypto.randomUUID(),
      tags: recipe.tags.filter((t) => t !== FAVORITE),
    };
    const { recipe: saved } = await callSaveRecipe<{ recipe: { slug: string } }>({ action: "save", recipe: copy }, who(to));
    refreshBook(to);
    return { ok: true, slug: saved.slug };
  } catch (e) {
    return failure(e);
  }
}

// A one-time signed link the browser uploads one file to directly: a cover photo, the original
// photo or PDF of a recipe added from photos, or the Pencil page.
export async function fileUploadUrl(
  book: BookId,
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
    }, who(book));
    return { ok: true, path, token };
  } catch (e) {
    return failure(e);
  }
}

// Save from the web: reads the recipe a site publishes for search engines (schema.org).
// Unlocked devices only, so the website can't be used to fetch pages for anyone else.
export async function importFromWeb(
  book: BookId,
  link: string,
): Promise<ActionResult<{ recipe: WebRecipe; url: string }> & { url?: string }> {
  const url = /^[a-z][a-z0-9+.-]*:/i.test(link.trim()) ? link.trim() : `https://${link.trim()}`;
  try {
    await callSaveRecipe({ action: "check" }, who(book));
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
export async function copyWebPhoto(book: BookId, recipeId: string, imageUrl: string): Promise<ActionResult<{ path: string }>> {
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
    }, who(book));
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
export async function recordCooked(book: BookId, id: string): Promise<ActionResult<{ timesCooked: number }>> {
  try {
    const { timesCooked } = await callSaveRecipe<{ timesCooked: number }>({ action: "cooked", id }, who(book));
    refreshBook(book);
    return { ok: true, timesCooked };
  } catch (e) {
    return failure(e);
  }
}

type GroceryRow = { id: string; text: string; checked: boolean };

// Adds lines to the end of the list; `recipeId` links them to the recipe they came from.
export async function addGroceries(
  book: BookId,
  items: string[],
  recipeId?: string,
): Promise<ActionResult<{ items: Pick<GroceryItem, "id" | "text" | "checked">[] }>> {
  try {
    const { items: added } = await callSaveRecipe<{ items: GroceryRow[] }>({
      action: "groceries-add",
      items,
      recipeId: recipeId ?? null,
    }, who(book));
    refreshBook(book);
    return { ok: true, items: added.map(({ id, text, checked }) => ({ id, text, checked })) };
  } catch (e) {
    return failure(e);
  }
}

export async function checkGrocery(book: BookId, id: string, checked: boolean): Promise<ActionResult> {
  try {
    await callSaveRecipe({ action: "grocery-check", id, checked }, who(book));
    refreshBook(book);
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}

// onlyChecked: "Clear checked"; otherwise "Clear all".
export async function clearGroceries(book: BookId, onlyChecked: boolean): Promise<ActionResult<{ removed: number }>> {
  try {
    const { removed } = await callSaveRecipe<{ removed: number }>({ action: "groceries-clear", onlyChecked }, who(book));
    refreshBook(book);
    return { ok: true, removed };
  } catch (e) {
    return failure(e);
  }
}

// ---- this week's meals (Home)

export async function addMeal(book: BookId, meal: { day: string; recipeId?: string; note?: string; servings?: number }): Promise<ActionResult<{ meal: Meal }>> {
  try {
    const { meal: row } = await callSaveRecipe<{ meal: { id: string; day: string; recipe_id: string | null; note: string | null; servings: number | null } }>({
      action: "plan-add",
      day: meal.day,
      recipeId: meal.recipeId ?? null,
      note: meal.note ?? null,
      servings: meal.servings ?? null,
    }, who(book));
    refreshBook(book);
    return { ok: true, meal: { id: row.id, day: row.day, recipeId: row.recipe_id, note: row.note ?? "", servings: row.servings } };
  } catch (e) {
    return failure(e);
  }
}

export async function removeMeal(book: BookId, id: string): Promise<ActionResult> {
  try {
    await callSaveRecipe({ action: "plan-remove", id }, who(book));
    refreshBook(book);
    return { ok: true };
  } catch (e) {
    return failure(e);
  }
}
