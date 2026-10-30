import "server-only";
import { cookies } from "next/headers";
import type { BookId } from "./books";

// The website's write path (docs/DESIGN.md "Behavior notes"): each book's write key lives in an
// httpOnly cookie set by Unlock editing, and only this server code sends it to save-recipe, which
// only lets a key change its own book.
export function keyCookie(book: BookId) {
  return book === "ramiya" ? "rb_write_key" : `rb_write_key_${book}`;
}
// Readable by page scripts, but only says "this browser is unlocked for this book", so editing
// buttons can show on static pages. It is not a secret and grants nothing by itself.
export function flagCookie(book: BookId) {
  return book === "ramiya" ? "rb_unlocked" : `rb_unlocked_${book}`;
}

const FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/save-recipe`;

export class WriteError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// `who` is the book whose unlocked key to send, or a key to check.
export async function callSaveRecipe<T = Record<string, unknown>>(
  body: Record<string, unknown>,
  who: { book: BookId } | { key: string },
): Promise<T> {
  const writeKey = "key" in who ? who.key : (await cookies()).get(keyCookie(who.book))?.value;
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
