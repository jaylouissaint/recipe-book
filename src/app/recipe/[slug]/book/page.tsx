import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackIcon } from "@/components/Icons";
import RecipePage from "@/components/RecipePage";
import { getRecipe, listRecipes } from "@/lib/recipes";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await listRecipes()).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const recipe = await getRecipe((await params).slug);
  return recipe ? { title: `${recipe.title} (book page)` } : {};
}

// The recipe as a page of the spiral book. Becomes the writing page in website step R2.
export default async function Page({ params }: Props) {
  const recipe = await getRecipe((await params).slug);
  if (!recipe) notFound();
  return (
    <main>
      <Link
        href={`/recipe/${recipe.slug}`}
        className="no-print mx-auto flex max-w-4xl items-center gap-1 px-2 pt-4 text-muted md:px-8"
      >
        <BackIcon className="size-5" />
        Back to recipe
      </Link>
      <RecipePage recipe={recipe} />
    </main>
  );
}
