import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CookMode from "@/components/kitchen/CookMode";
import { getRecipe } from "@/lib/recipes";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ scale?: string; step?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = await getRecipe((await params).slug);
  return recipe ? { title: `Cooking ${recipe.title}` } : {};
}

// Start Cooking; ?scale=1.5 comes from the recipe's serving scaler, ?step=3 from Home's "Continue".
export default async function Cook({ params, searchParams }: Props) {
  const recipe = await getRecipe((await params).slug);
  if (!recipe) notFound();
  const query = await searchParams;
  const scale = Number(query.scale);
  const step = Number(query.step);
  return (
    <CookMode
      recipe={recipe}
      factor={Number.isFinite(scale) && scale > 0 && scale <= 10 ? scale : 1}
      start={Number.isInteger(step) && step > 0 ? step : 0}
    />
  );
}
