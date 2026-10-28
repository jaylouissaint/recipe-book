import type { Metadata } from "next";
import LibraryList from "@/components/LibraryList";
import { listRecipes } from "@/lib/recipes";

export const revalidate = 60;
export const metadata: Metadata = { title: "My Recipes" };

export default async function Library() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="mb-5 font-serif text-[2.6rem] leading-none md:text-5xl">My Recipes</h1>
      <LibraryList recipes={await listRecipes()} />
    </main>
  );
}
