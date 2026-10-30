"use client";

import Link from "next/link";
import { BOOKS, BOOK_IDS, bookPath } from "@/lib/books";
import { useBook } from "./BookContext";

// Settings' "Who's using this": opens the other book, and remembers the choice on this device so the
// site's front page opens that book (the rb_book cookie, read by src/middleware.ts).
export default function BookSwitch() {
  const current = useBook().id;
  return (
    <div className="inline-flex rounded-full bg-field p-1" role="radiogroup" aria-label="Who's using this">
      {BOOK_IDS.map((id) => {
        const on = id === current;
        return (
          <Link
            key={id}
            href={bookPath(id, "/settings")}
            role="radio"
            aria-checked={on}
            onClick={() => {
              document.cookie = `rb_book=${id}; path=/; max-age=31536000; samesite=lax`;
            }}
            className={`rounded-full px-6 py-2.5 text-[15px] ${on ? "bg-surface font-semibold text-accent shadow-sm" : "text-muted hover:text-fg"}`}
          >
            {BOOKS[id].owner}
          </Link>
        );
      })}
    </div>
  );
}
