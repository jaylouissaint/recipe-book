import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RecipeView from "@/components/RecipeView";
import { getRecipe, listRecipes } from "@/lib/recipes";

// Rebuild from the database at most once a minute, so saves show up without a redeploy.
export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await listRecipes()).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = await getRecipe((await params).slug);
  return recipe ? { title: recipe.title } : {};
}

export default async function Page({ params }: Props) {
  const recipe = await getRecipe((await params).slug);
  if (!recipe) notFound();
  return <RecipeView recipe={recipe} />;
}
