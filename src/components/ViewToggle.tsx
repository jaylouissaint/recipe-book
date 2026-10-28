import Link from "next/link";

// Shelf | Book switch at the top of Home and the book view.
export default function ViewToggle({ active }: { active: "shelf" | "book" }) {
  const item = (on: boolean) =>
    `rounded-full px-5 py-2 text-[15px] ${on ? "bg-accent font-semibold text-white" : "text-muted hover:text-fg"}`;
  return (
    <nav aria-label="View" className="inline-flex rounded-full bg-field p-1">
      <Link href="/" aria-current={active === "shelf" ? "page" : undefined} className={item(active === "shelf")}>
        Shelf
      </Link>
      <Link href="/book" aria-current={active === "book" ? "page" : undefined} className={item(active === "book")}>
        Book
      </Link>
    </nav>
  );
}
