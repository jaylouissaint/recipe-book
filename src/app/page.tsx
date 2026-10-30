import Link from "next/link";
import AddButton from "@/components/AddButton";
import PickUp from "@/components/home/PickUp";
import WeekPlan from "@/components/home/WeekPlan";
import { listGroceries } from "@/lib/groceries";
import { listMeals } from "@/lib/plan";
import { listRecipes } from "@/lib/recipes";
import type { Recipe } from "@/lib/types";

// Home is the page you open before cooking or shopping (docs/DESIGN.md "Home"): pick up where you
// left off, this week's meals, the grocery list at a glance, and recipes still to finish.
// Browsing is the Library's job. Always fresh, since the plan and the list change often.
export const dynamic = "force-dynamic";

// Written on the page with the Pencil, but with no typed lines yet.
const handwrittenOnly = (r: Recipe) =>
  Boolean(r.handwritingPath?.endsWith(".png")) && !r.ingredientGroups.length && !r.stepGroups.length;

export default async function Home() {
  const [recipes, meals, groceries] = await Promise.all([listRecipes(), listMeals(), listGroceries()]);
  const toBuy = groceries.filter((g) => !g.checked);
  const toFinish = recipes.filter(handwrittenOnly);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-8 md:py-12">
      <h1 className="font-serif text-[2.6rem] leading-none md:text-5xl">{"Ramiya’s Recipes"}</h1>

      <PickUp recipes={recipes.map((r) => ({ slug: r.slug, title: r.title }))} />

      <WeekPlan meals={meals} recipes={recipes} />

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="glance" className="rounded-[20px] bg-surface p-5 shadow-card">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="glance" className="text-2xl font-medium">
              Groceries
            </h2>
            <Link href="/groceries" className="text-[15px] font-semibold text-accent">
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
                  <Link href={`/recipe/${r.slug}`} className="min-w-0 truncate font-hand text-xl text-ink hover:underline">
                    {r.title}
                  </Link>
                  <Link href={`/recipe/${r.slug}/edit?lines=1`} className="shrink-0 text-[14px] font-semibold text-accent">
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
