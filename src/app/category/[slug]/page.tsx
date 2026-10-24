import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Cover from "@/components/Cover";
import { CATEGORIES, categoryBySlug } from "@/lib/book";
import { listRecipes } from "@/lib/recipes";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = categoryBySlug((await params).slug);
  return { title: category ? `${category.name} · Recipe Book` : "Recipe Book" };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) notFound();
  return <Cover subtitle={category.name} activeCategory={slug} recipes={await listRecipes(slug)} />;
}
