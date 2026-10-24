import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RecipePage from "@/components/RecipePage";
import { getRecipe, listRecipes } from "@/lib/recipes";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return (await listRecipes()).map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = await getRecipe((await params).id);
  return { title: recipe ? `${recipe.title} · Recipe Book` : "Recipe Book" };
}

export default async function Page({ params }: Props) {
  const recipe = await getRecipe((await params).id);
  if (!recipe) notFound();
  return (
    <main>
      <Link href="/" className="no-print label-caps mx-auto block max-w-4xl px-4 pt-4 md:px-10">
        ← all recipes
      </Link>
      <RecipePage recipe={recipe} />
    </main>
  );
}
