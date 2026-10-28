import Link from "next/link";
import { CATEGORIES } from "@/lib/book";
import type { Recipe } from "@/lib/types";
import Thumb from "./Thumb";

// The book's colored category dividers, as the top of the Home shelf.
export function ShelfTabs({ recipes }: { recipes: Recipe[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {CATEGORIES.map((c) => {
        const count = recipes.filter((r) => r.category === c.slug).length;
        return (
          <li key={c.slug}>
            <Link
              href={`/category/${c.slug}`}
              className={`${c.tabClass} flex h-28 flex-col justify-between rounded-[20px] rounded-tl-md p-4 text-white shadow-card transition-transform hover:-translate-y-0.5 md:h-36`}
            >
              <span className="label-caps !text-[0.8rem] !text-white">{c.name}</span>
              <span className="text-sm text-white/90">
                {count} {count === 1 ? "recipe" : "recipes"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// A horizontally scrolling row of small cards ("Family Favorites", "Recently added").
export function RecipeStrip({ title, recipes }: { title: string; recipes: Recipe[] }) {
  if (recipes.length === 0) return null;
  return (
    <section aria-label={title} className="mt-10">
      <h2 className="text-xl font-medium">{title}</h2>
      <ul className="-mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
        {recipes.map((r) => (
          <li key={r.id} className="w-40 shrink-0 snap-start md:w-48">
            <Link href={`/recipe/${r.slug}`} className="block rounded-[20px] bg-surface p-2 shadow-card">
              <Thumb recipe={r} className="aspect-square w-full" />
              <p className="mt-2 line-clamp-2 px-1 pb-1 font-hand text-lg leading-6 text-ink">{r.title}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
