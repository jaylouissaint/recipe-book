import type { Metadata } from "next";
import BookView from "@/components/book/BookView";
import ViewToggle from "@/components/ViewToggle";
import { bookParam } from "@/lib/bookParam";
import { listRecipes } from "@/lib/recipes";

export const revalidate = 60;
export const metadata: Metadata = { title: "The book" };

export default async function Book({ params }: { params: Promise<{ book: string }> }) {
  return (
    // Fills the screen, between the phone tab bar (5rem) or below the top capsule (3.5rem), so a
    // whole page is always in view.
    <main className="flex h-[calc(100dvh-5rem)] flex-col px-4 pt-4 md:h-[calc(100dvh-3.5rem)] md:px-8 navside:md:h-dvh lg:pt-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-3xl leading-none md:text-4xl">My Recipes</h1>
        <ViewToggle active="book" />
      </div>
      <BookView recipes={await listRecipes(await bookParam(params))} />
    </main>
  );
}
