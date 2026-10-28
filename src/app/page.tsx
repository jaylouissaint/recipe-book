import AddButton from "@/components/AddButton";
import { RecipeStrip, ShelfTabs } from "@/components/Shelf";
import { listRecipes } from "@/lib/recipes";

export const revalidate = 60;

export default async function Home() {
  const recipes = await listRecipes();
  const favorites = recipes.filter((r) => r.tags.includes("family-favorite"));
  const recent = [...recipes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="mb-6 font-serif text-[2.6rem] leading-none md:text-5xl">{"Ramiya’s Recipes"}</h1>
      <ShelfTabs recipes={recipes} />
      <RecipeStrip title="Family Favorites" recipes={favorites} />
      <RecipeStrip title="Recently added" recipes={recent} />
      <AddButton />
    </main>
  );
}
