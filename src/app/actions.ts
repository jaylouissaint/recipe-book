"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
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

// A one-time signed link the browser uploads one photo to directly.
export async function photoUploadUrl(
  recipeId: string,
  ext: string,
): Promise<ActionResult<{ path: string; token: string }>> {
  try {
    const { path, token } = await callSaveRecipe<{ path: string; token: string }>({
      action: "upload-url",
      bucket: "photos",
      recipeId,
      ext,
    });
    return { ok: true, path, token };
  } catch (e) {
    return failure(e);
  }
}
