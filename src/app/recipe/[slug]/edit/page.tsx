import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RecipeEditor from "@/components/RecipeEditor";
import { getRecipe } from "@/lib/recipes";

// Always edit the latest saved version, never a cached page.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ lines?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = await getRecipe((await params).slug);
  return recipe ? { title: `Edit ${recipe.title}` } : {};
}

// ?lines=1 ("Type the lines") opens a handwritten recipe on the lines.
export default async function EditRecipe({ params, searchParams }: Props) {
  const recipe = await getRecipe((await params).slug);
  if (!recipe) notFound();
  return <RecipeEditor recipe={recipe} startMode={(await searchParams).lines ? "lines" : undefined} />;
}
