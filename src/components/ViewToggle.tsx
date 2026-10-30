"use client";

import Link from "next/link";
import { useBook } from "./BookContext";

// List | Book switch at the top of the Library and the book view.
export default function ViewToggle({ active }: { active: "list" | "book" }) {
  const { path } = useBook();
  const item = (on: boolean) =>
    `rounded-full px-5 py-2 text-[15px] ${on ? "bg-accent font-semibold text-white" : "text-muted hover:text-fg"}`;
  return (
    <nav aria-label="View" className="inline-flex rounded-full bg-field p-1">
      <Link href={path("/library")} aria-current={active === "list" ? "page" : undefined} className={item(active === "list")}>
        List
      </Link>
      <Link href={path("/book")} aria-current={active === "book" ? "page" : undefined} className={item(active === "book")}>
        Book
      </Link>
    </nav>
  );
}
