"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { BookId } from "@/lib/books";
import { useBook } from "./BookContext";

// "rb_unlocked" (Ramiya's book) or "rb_unlocked_jay" is set next to the book's httpOnly write-key
// cookie by Unlock editing (src/app/actions.ts).
function flag(book: BookId) {
  return book === "ramiya" ? "rb_unlocked" : `rb_unlocked_${book}`;
}

export function readUnlocked(book: BookId) {
  return document.cookie.split("; ").some((c) => c === `${flag(book)}=1`);
}

// Cookies have no change event; pages re-check whenever they're shown again.
function subscribe(onChange: () => void) {
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

// Whether this browser can change a book: the book on screen unless another is given.
export function useUnlocked(book?: BookId) {
  const current = useBook().id;
  const id = book ?? current;
  const read = useCallback(() => readUnlocked(id), [id]);
  return useSyncExternalStore(subscribe, read, () => false);
}

// Shows its children only in a browser that has been unlocked for the book on screen.
export default function EditOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return useUnlocked() ? children : fallback;
}
