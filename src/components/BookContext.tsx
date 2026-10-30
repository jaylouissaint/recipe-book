"use client";

import { createContext, useContext } from "react";
import { BOOKS, type BookId, bookPath } from "@/lib/books";

// Which book the page on screen belongs to, for client components: its name, and `path()` to make
// links that stay in it ("/library" -> "/jay/library" in Jay's book).
const BookContext = createContext<BookId>("ramiya");

export function BookProvider({ book, children }: { book: BookId; children: React.ReactNode }) {
  return <BookContext.Provider value={book}>{children}</BookContext.Provider>;
}

export function useBook() {
  const id = useContext(BookContext);
  return { ...BOOKS[id], id, path: (p: string) => bookPath(id, p) };
}
