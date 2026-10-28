import "server-only";
import { cookies } from "next/headers";

// The website's write path (docs/DESIGN.md "Behavior notes"): the write key lives in an
// httpOnly cookie set by Unlock editing, and only this server code sends it to save-recipe.
export const KEY_COOKIE = "rb_write_key";
// Readable by page scripts, but only says "this browser is unlocked", so editing buttons can show
// on static pages. It is not a secret and grants nothing by itself.
export const FLAG_COOKIE = "rb_unlocked";

const FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/save-recipe`;

export class WriteError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function callSaveRecipe<T = Record<string, unknown>>(body: Record<string, unknown>, key?: string): Promise<T> {
  const writeKey = key ?? (await cookies()).get(KEY_COOKIE)?.value;
  if (!writeKey) throw new WriteError("Editing is locked on this device. Unlock it in Settings.", 401);
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-write-key": writeKey },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      res.status === 401 ? "The write key on this device isn't accepted. Unlock again in Settings." : data.error;
    throw new WriteError(message ?? `Saving failed (${res.status})`, res.status);
  }
  return data as T;
}
