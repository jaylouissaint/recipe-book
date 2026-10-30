import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RecipeView from "@/components/RecipeView";
import { isBook } from "@/lib/books";
import { bookParam } from "@/lib/bookParam";
import { getRecipe, listRecipes } from "@/lib/recipes";

// Rebuild from the database at most once a minute, so saves show up without a redeploy.
export const revalidate = 60;

type Props = { params: Promise<{ book: string; slug: string }> };

// Each book's recipes, built ahead (the book comes from src/app/b/[book]/layout.tsx).
export async function generateStaticParams({ params }: { params: { book: string } }) {
  if (!isBook(params.book)) return [];
  return (await listRecipes(params.book)).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = await getRecipe(await bookParam(params), (await params).slug);
  return recipe ? { title: recipe.title } : {};
}

export default async function Page({ params }: Props) {
  const book = await bookParam(params);
  const recipe = await getRecipe(book, (await params).slug);
  if (!recipe) notFound();
  return <RecipeView recipe={recipe} book={book} />;
}
