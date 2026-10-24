import Link from "next/link";
import type { Recipe } from "@/lib/types";
import { TAGS } from "@/lib/book";

// A small page-style card for the home and category grids.
export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const tagLabels = TAGS.filter((t) => recipe.tags.includes(t.id)).map((t) => t.label);
  const favorite = recipe.tags.includes("family-favorite");
  const minutes = (recipe.prepMin ?? 0) + (recipe.cookMin ?? 0);

  return (
    <Link
      href={`/recipe/${recipe.id}`}
      className="paper-lines block rounded-sm bg-paper px-4 pt-1 pb-6 shadow-[0_2px_10px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-0.5"
    >
      <p className="flex items-start gap-1.5">
        <span className="font-slab text-sm leading-9 font-light text-label">recipe:</span>
        <span className="font-hand text-xl leading-9">{recipe.title}</span>
        {favorite && <span className="text-2xl leading-9 font-bold text-teal">*</span>}
      </p>
      <p className="label-caps">
        {[recipe.servings && `Serves ${recipe.servings}`, minutes > 0 && `${minutes} min`]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {tagLabels.length > 0 && <p className="label-caps !text-ink">{tagLabels.join(" · ")}</p>}
    </Link>
  );
}
