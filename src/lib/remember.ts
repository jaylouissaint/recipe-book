// What this browser remembers for Home's "Pick up where you left off": where Start Cooking was
// left, and the last recipe opened. Kept per browser (localStorage); nothing is saved online.
// Every read and write is guarded: storage can be missing or full (private browsing). Each book
// keeps its own (Ramiya's under the original names, so nothing saved before is lost).
import type { BookId } from "./books";

// page 0 is "Gather your ingredients", then one page per step.
export type Cooking = { slug: string; title: string; page: number; steps: number; scale: number; at: number };
export type Opened = { slug: string; title: string; at: number };

const name = (key: string, book: BookId) => (book === "ramiya" ? key : `${key}:${book}`);
const COOKING = "rb-cooking";
const OPENED = "rb-last-recipe";
const DAY = 86_400_000;

function read<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// Cooking left more than a day ago doesn't count as "in progress" any more.
export const cooking = (book: BookId) => {
  const c = read<Cooking>(name(COOKING, book));
  return c && Date.now() - c.at < DAY ? c : null;
};
export const setCooking = (book: BookId, c: Cooking | null) => write(name(COOKING, book), c);
export const lastOpened = (book: BookId) => read<Opened>(name(OPENED, book));
export const setLastOpened = (book: BookId, o: Opened) => write(name(OPENED, book), o);
