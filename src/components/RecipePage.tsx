import { ingredientText } from "@/lib/format";
import type { IngredientGroup, Recipe } from "@/lib/types";
import SideTabs from "./SideTabs";
import Spiral from "./Spiral";
import StatBox from "./StatBox";
import { PlateSetting, RollingPin, WhiskAndSpoon } from "./Stickers";
import TagRow from "./TagRow";

// One ruled line per entry: a group name, an ingredient, a blank spacer,
// or padding that evens up the two columns (hidden when they stack on phones).
type Line = { kind: "name" | "item" | "blank" | "pad"; text: string };

function groupLines(g: IngredientGroup): Line[] {
  const lines: Line[] = g.name ? [{ kind: "name", text: g.name }] : [];
  return lines.concat(g.items.map((i) => ({ kind: "item", text: ingredientText(i) })));
}

// Whole groups go left until the left column holds about half the lines, like in the book.
// Both columns are then padded to the same number of ruled lines.
function splitColumns(groups: IngredientGroup[]): [Line[], Line[]] {
  const blocks = groups.map(groupLines);
  const total = blocks.reduce((n, b) => n + b.length, 0);
  const left: Line[] = [];
  const right: Line[] = [];
  for (const b of blocks) {
    const col = left.length < total / 2 ? left : right;
    if (col.length) col.push({ kind: "blank", text: "" });
    col.push(...b);
  }
  const height = Math.max(left.length, right.length) + 1;
  for (const col of [left, right]) {
    while (col.length < height) col.push({ kind: "pad", text: "" });
  }
  right[right.length - 1].kind = "blank";
  return [left, right];
}

function IngredientColumn({ lines }: { lines: Line[] }) {
  return (
    <ul>
      {lines.map((l, i) => (
        <li
          key={i}
          className={`ruled font-hand text-xl ${l.kind === "name" ? "text-right text-lg opacity-80" : ""} ${
            l.kind === "pad" ? "hidden md:block" : ""
          }`}
        >
          {l.text || " "}
        </li>
      ))}
    </ul>
  );
}

export default function RecipePage({ recipe }: { recipe: Recipe }) {
  const [left, right] = splitColumns(recipe.ingredientGroups);
  const favorite = recipe.tags.includes("family-favorite");

  return (
    <div className="relative mx-auto max-w-4xl px-4 py-6 md:px-10 md:py-10">
      <article className="relative rounded-sm bg-paper text-ink px-5 py-6 shadow-[0_2px_12px_rgba(0,0,0,0.12)] md:pr-10 md:pl-14 md:py-8">
        <Spiral />
        <SideTabs active={recipe.category} />

        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <h1 className="flex items-start gap-2">
            <span className="font-slab text-xl font-light text-label">recipe:</span>
            <span className="font-hand text-2xl leading-7 md:text-3xl md:leading-8">
              {recipe.title}
            </span>
            {favorite && (
              <span className="font-sans text-4xl leading-8 font-bold text-teal" title="Family favorite">
                *
              </span>
            )}
          </h1>
          <StatBox servings={recipe.servings} prepMin={recipe.prepMin} cookMin={recipe.cookMin} />
        </header>

        <div className="mt-4 border-b border-rule pb-2">
          <TagRow tags={recipe.tags} />
        </div>

        <section className="relative mt-6" aria-labelledby="ingredients">
          <div className="flex items-center gap-4">
            <h2 id="ingredients" className="label-caps">
              Ingredients
            </h2>
            <RollingPin className="hidden h-5 w-28 md:block" />
          </div>
          <div className="grid gap-x-8 md:grid-cols-2">
            <IngredientColumn lines={left} />
            <IngredientColumn lines={right} />
          </div>
        </section>

        <section className="relative mt-8" aria-labelledby="directions">
          <div className="flex items-end justify-between">
            <div className="flex items-end gap-6">
              <h2 id="directions" className="label-caps">
                Directions
              </h2>
              <WhiskAndSpoon className="hidden h-20 w-24 -translate-y-2 md:block" />
            </div>
            <PlateSetting className="hidden h-14 w-28 md:block" />
          </div>
          <ol className="paper-lines min-h-[18rem] border-t border-rule font-hand text-xl">
            {recipe.stepGroups.map((g, i) => (
              <li key={i}>
                <span className="mr-1 text-base" aria-hidden>
                  ▷
                </span>
                {g.title}
                {g.steps.length > 0 && (
                  <ul className="pl-10 md:pl-16">
                    {g.steps.map((s, j) => (
                      <li key={j} className="-indent-3 pl-3">
                        <span aria-hidden>– </span>
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>

        {recipe.notes && (
          <section className="mt-6" aria-labelledby="notes">
            <h2 id="notes" className="label-caps">
              Notes
            </h2>
            <p className="paper-lines font-hand text-xl">{recipe.notes}</p>
          </section>
        )}
      </article>
    </div>
  );
}
