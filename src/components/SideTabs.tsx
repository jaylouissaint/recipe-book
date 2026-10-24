import Link from "next/link";
import { CATEGORIES } from "@/lib/book";

// Colored category tabs. "edge": vertical tabs on the page's right edge on wide screens,
// falling back to a horizontal strip on phones. "strip": always the horizontal strip.
export default function SideTabs({
  active,
  layout = "edge",
}: {
  active?: string;
  layout?: "edge" | "strip";
}) {
  const edge = layout === "edge";
  return (
    <nav aria-label="Categories" className="no-print">
      <ul
        className={`flex gap-1 overflow-x-auto pb-2 ${
          edge ? "md:absolute md:top-24 md:-right-9 md:flex-col md:gap-2 md:overflow-visible md:pb-0" : ""
        }`}
      >
        {CATEGORIES.map((c) => {
          const isActive = c.slug === active;
          return (
            <li key={c.slug}>
              <Link
                href={`/category/${c.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={`${c.tabClass} label-caps block shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 !text-white transition-transform ${
                  edge
                    ? `md:tab-vertical md:rounded-l-none md:px-2 md:py-5 ${isActive ? "md:translate-x-1.5" : "md:hover:translate-x-1"}`
                    : isActive
                      ? "ring-2 ring-ink/40"
                      : ""
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
