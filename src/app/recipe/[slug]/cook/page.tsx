import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CookMode from "@/components/kitchen/CookMode";
import { getRecipe } from "@/lib/recipes";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ scale?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = await getRecipe((await params).slug);
  return recipe ? { title: `Cooking ${recipe.title}` } : {};
}

// Start Cooking; ?scale=1.5 comes from the recipe's serving scaler.
export default async function Cook({ params, searchParams }: Props) {
  const recipe = await getRecipe((await params).slug);
  if (!recipe) notFound();
  const scale = Number((await searchParams).scale);
  return <CookMode recipe={recipe} factor={Number.isFinite(scale) && scale > 0 && scale <= 10 ? scale : 1} />;
}
