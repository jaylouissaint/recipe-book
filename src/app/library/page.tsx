import AddButton from "@/components/AddButton";
import type { Metadata } from "next";
import LibraryList from "@/components/LibraryList";
import ViewToggle from "@/components/ViewToggle";
import { listRecipes } from "@/lib/recipes";

export const revalidate = 60;
export const metadata: Metadata = { title: "My Recipes" };

export default async function Library() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-[2.6rem] leading-none md:text-5xl">My Recipes</h1>
        <ViewToggle active="list" />
      </div>
      <LibraryList recipes={await listRecipes()} />
      <AddButton />
    </main>
  );
}
