import { redirect } from "next/navigation";
import { bookParam } from "@/lib/bookParam";
import { bookPath } from "@/lib/books";

// Category pages became the Library's category filters (2026-10-29); old links still work.
type Props = { params: Promise<{ book: string; slug: string }> };

export default async function Page({ params }: Props) {
  const book = await bookParam(params);
  redirect(bookPath(book, `/library?category=${encodeURIComponent((await params).slug)}`));
}
