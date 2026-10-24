import Link from "next/link";
import type { Recipe } from "@/lib/types";
import RecipeCard from "./RecipeCard";
import SideTabs from "./SideTabs";

// The raspberry book cover with the category strip and a grid of recipe cards.
// Used by the home page and the category pages.
export default function Cover({
  subtitle,
  activeCategory,
  recipes,
}: {
  subtitle?: string;
  activeCategory?: string;
  recipes: Recipe[];
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <header className="bg-cover p-2 text-white shadow-md">
        <div className="border border-white/80 px-6 py-8 text-center md:py-12">
          <Link href="/" className="font-slab text-4xl font-light tracking-wide md:text-5xl">
            recipes
          </Link>
          {subtitle && <p className="label-caps mt-2 !text-white/85">{subtitle}</p>}
        </div>
      </header>

      <div className="mt-4">
        <SideTabs active={activeCategory} layout="strip" />
      </div>

      {recipes.length === 0 ? (
        <p className="mt-10 text-center font-hand text-2xl">no recipes here yet</p>
      ) : (
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <li key={r.id}>
              <RecipeCard recipe={r} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
