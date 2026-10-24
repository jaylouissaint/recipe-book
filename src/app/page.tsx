import Cover from "@/components/Cover";
import { listRecipes } from "@/lib/recipes";

export default async function Home() {
  return <Cover subtitle="written by hand" recipes={await listRecipes()} />;
}
