import Link from "next/link";
import { CATEGORIES } from "@/lib/book";

// Colored category tabs on the book page: vertical on the page's right edge on wide screens,
// a horizontal strip above the page on phones.
export default function SideTabs({ active }: { active?: string }) {
  return (
    <nav aria-label="Categories" className="no-print">
      <ul className="flex gap-1 overflow-x-auto pb-2 md:absolute md:top-24 md:-right-9 md:flex-col md:gap-2 md:overflow-visible md:pb-0">
        {CATEGORIES.map((c) => {
          const isActive = c.slug === active;
          return (
            <li key={c.slug}>
              <Link
                href={`/category/${c.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={`${c.tabClass} label-caps block shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 !text-white transition-transform md:tab-vertical md:rounded-l-none md:px-2 md:py-5 ${
                  isActive ? "md:translate-x-1.5" : "md:hover:translate-x-1"
                }`}
              >
                {c.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
