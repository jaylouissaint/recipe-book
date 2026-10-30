import type { Metadata } from "next";
import BookView from "@/components/book/BookView";
import ViewToggle from "@/components/ViewToggle";
import { listRecipes } from "@/lib/recipes";

export const revalidate = 60;
export const metadata: Metadata = { title: "The book" };

export default async function Book() {
  return (
    // Fills the screen above the phone tab bar (5rem) so a whole page is always in view.
    <main className="flex h-[calc(100dvh-5rem)] flex-col px-4 pt-4 md:px-8 lg:h-dvh lg:pt-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl leading-none md:text-4xl">My Recipes</h1>
        <ViewToggle active="book" />
      </div>
      <BookView recipes={await listRecipes()} />
    </main>
  );
}
