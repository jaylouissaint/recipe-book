import Link from "next/link";
import type { Recipe } from "@/lib/types";
import { PotIcon } from "./Icons";
import SourceLine from "./SourceLine";
import Thumb from "./Thumb";

// One row of the Library, like the Deglaze "My Recipes" cards.
export default function LibraryCard({ recipe }: { recipe: Recipe }) {
  const favorite = recipe.tags.includes("family-favorite");
  return (
    <Link
      href={`/recipe/${recipe.slug}`}
      className="flex items-center gap-4 rounded-[20px] bg-surface p-2 pr-4 shadow-card transition-transform hover:-translate-y-0.5"
    >
      <Thumb recipe={recipe} className="size-[88px] shrink-0" />
      <div className="min-w-0 flex-1 py-1">
        <div className="flex items-center justify-between gap-2">
          <SourceLine recipe={recipe} />
          {recipe.timesCooked > 0 && (
            <span className="flex items-center gap-1 text-[13px] text-muted" title={`Cooked ${recipe.timesCooked} times`}>
              <PotIcon className="size-4" />
              {recipe.timesCooked}
            </span>
          )}
        </div>
        <p className="mt-1 font-hand text-xl leading-6 text-ink">
          {recipe.title}
          {favorite && (
            <span className="ml-1 font-sans font-bold text-teal" title="Family favorite">
              *
            </span>
          )}
        </p>
        {recipe.author && <p className="mt-0.5 text-[13px] text-muted">by {recipe.author}</p>}
      </div>
    </Link>
  );
}
