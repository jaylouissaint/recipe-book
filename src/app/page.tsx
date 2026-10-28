import AddButton from "@/components/AddButton";
import { RecipeStrip, ShelfTabs } from "@/components/Shelf";
import ViewToggle from "@/components/ViewToggle";
import { listRecipes } from "@/lib/recipes";

export const revalidate = 60;

export default async function Home() {
  const recipes = await listRecipes();
  const favorites = recipes.filter((r) => r.tags.includes("family-favorite"));
  const recent = [...recipes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-[2.6rem] leading-none md:text-5xl">{"Ramiya’s Recipes"}</h1>
        <ViewToggle active="shelf" />
      </div>
      <ShelfTabs recipes={recipes} />
      <RecipeStrip title="Family Favorites" recipes={favorites} />
      <RecipeStrip title="Recently added" recipes={recent} />
      <AddButton />
    </main>
  );
}
