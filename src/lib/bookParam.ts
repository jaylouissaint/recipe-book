import { notFound } from "next/navigation";
import { type BookId, isBook } from "./books";

// The book a page is in, from its address (src/app/b/[book]/…).
export async function bookParam(params: Promise<{ book: string }>): Promise<BookId> {
  const { book } = await params;
  if (!isBook(book)) notFound();
  return book;
}
