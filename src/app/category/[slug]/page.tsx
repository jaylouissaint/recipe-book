import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackIcon } from "@/components/Icons";
import LibraryList from "@/components/LibraryList";
import { CATEGORIES, categoryBySlug } from "@/lib/book";
import { listRecipes } from "@/lib/recipes";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = categoryBySlug((await params).slug);
  return category ? { title: category.name } : {};
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) notFound();
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <Link href="/" className="-ml-2 mb-2 inline-flex items-center gap-1 rounded-full p-2 text-muted hover:bg-field">
        <BackIcon className="size-5" />
        Home
      </Link>
      <h1 className="mb-5 flex items-center gap-3 font-serif text-[2.6rem] leading-none md:text-5xl">
        <span aria-hidden className={`${category.tabClass} inline-block size-4 rounded-full`} />
        {category.name}
      </h1>
      <LibraryList recipes={await listRecipes(slug)} showCategories={false} />
    </main>
  );
}
