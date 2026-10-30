import Link from "next/link";
import AddButton from "@/components/AddButton";
import PickUp from "@/components/home/PickUp";
import WeekPlan from "@/components/home/WeekPlan";
import Thumb from "@/components/Thumb";
import { BOOKS, bookPath } from "@/lib/books";
import { bookParam } from "@/lib/bookParam";
import { listGroceries } from "@/lib/groceries";
import { notMadeLately } from "@/lib/lately";
import { listMeals } from "@/lib/plan";
import { listRecipes } from "@/lib/recipes";
import type { Recipe } from "@/lib/types";

// Home is the page you open before cooking or shopping (docs/DESIGN.md "Home"): pick up where you
// left off, this week's meals, the grocery list at a glance, and recipes still to finish.
// Browsing is the Library's job. A cached page like the rest, so switching to it is instant: every
// change to recipes, the list or the week refreshes it, and open pages hear about changes through
// live updates.
export const revalidate = 60;

// Written on the page with the Pencil, but with no typed lines yet.
const handwrittenOnly = (r: Recipe) =>
  Boolean(r.handwritingPath?.endsWith(".png")) && !r.ingredientGroups.length && !r.stepGroups.length;

export default async function Home({ params }: { params: Promise<{ book: string }> }) {
  const book = await bookParam(params);
  const [recipes, meals, groceries] = await Promise.all([listRecipes(book), listMeals(book), listGroceries(book)]);
  const toBuy = groceries.filter((g) => !g.checked);
  const toFinish = recipes.filter(handwrittenOnly);
  // Recipes already planned from today on aren't suggested again.
  const today = new Date().toISOString().slice(0, 10);
  const planned = new Set((meals ?? []).filter((m) => m.day >= today && m.recipeId).map((m) => m.recipeId!));
  const lately = notMadeLately(recipes, planned);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-8 md:py-12">
      <h1 className="font-serif text-[2.6rem] leading-none md:text-5xl">{BOOKS[book].name}</h1>

      <PickUp recipes={recipes.map((r) => ({ slug: r.slug, title: r.title }))} />

      <WeekPlan meals={meals} recipes={recipes} />

      {lately.length > 0 && (
        <section aria-labelledby="lately">
          <h2 id="lately" className="mb-3 text-2xl font-medium">
            Haven’t made in a while
          </h2>
          <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 md:-mx-8 md:scroll-px-8 md:px-8">
            {lately.map(({ recipe, label }) => (
              <li key={recipe.id} className="w-40 shrink-0 snap-start">
                <Link href={bookPath(book, `/recipe/${recipe.slug}`)} className="block rounded-[20px] bg-surface p-2 shadow-card">
                  <Thumb recipe={recipe} className="aspect-square w-full" />
                  <p className="mt-2 line-clamp-2 px-1 font-hand text-lg leading-6 text-ink">{recipe.title}</p>
                  <p className="px-1 pb-1 text-[12px] text-muted">{label}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="glance" className="rounded-[20px] bg-surface p-5 shadow-card">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="glance" className="text-2xl font-medium">
              Groceries
            </h2>
            <Link href={bookPath(book, "/groceries")} className="text-[15px] font-semibold text-accent">
              Open the list
            </Link>
          </div>
          {toBuy.length === 0 ? (
            <p className="mt-3 font-hand text-xl text-muted">nothing to buy</p>
          ) : (
            <>
              <p className="mt-1 text-[14px] text-muted">
                {toBuy.length} item{toBuy.length === 1 ? "" : "s"} left to buy
              </p>
              {/* The whole list, scrolling inside the card so Home keeps its shape. */}
              <ul
                tabIndex={0}
                aria-label="Left to buy"
                className="mt-2 max-h-64 divide-y divide-divider overflow-y-auto overscroll-contain rounded-xl pr-1 focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none"
              >
                {toBuy.map((g) => (
                  <li key={g.id} className="truncate py-1.5 font-hand text-xl text-ink">
                    {g.text}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {toFinish.length > 0 && (
          <section aria-labelledby="finish" className="rounded-[20px] bg-surface p-5 shadow-card">
            <h2 id="finish" className="text-2xl font-medium">
              To finish
            </h2>
            <p className="mt-1 text-[14px] text-muted">
              Written by hand only. Type their lines to scale them, add them to Groceries and cook with Start Cooking.
            </p>
            <ul className="mt-2 divide-y divide-divider">
              {toFinish.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={bookPath(book, `/recipe/${r.slug}`)} className="min-w-0 truncate font-hand text-xl text-ink hover:underline">
                    {r.title}
                  </Link>
                  <Link href={bookPath(book, `/recipe/${r.slug}/edit?lines=1`)} className="shrink-0 text-[14px] font-semibold text-accent">
                    Type the lines
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <AddButton />
    </main>
  );
}
