import type { Metadata } from "next";
import RecipeEditor from "@/components/RecipeEditor";

export const metadata: Metadata = { title: "New recipe" };

export default function NewRecipe() {
  return <RecipeEditor recipe={null} />;
}
