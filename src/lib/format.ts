import type { Ingredient, Recipe } from "./types";

const FRACTIONS: Record<string, string> = {
  "1/2": "½",
  "1/3": "⅓",
  "2/3": "⅔",
  "1/4": "¼",
  "3/4": "¾",
};

// An ingredient as written, with common fractions shown as ½ ⅓ ⅔ ¼ ¾.
export function ingredientText({ quantity, unit, item }: Ingredient) {
  const q = quantity.replace(/\d+\/\d+/g, (f) => FRACTIONS[f] ?? f);
  return [q && unit ? `${q} ${unit}` : q, item].filter(Boolean).join(" ");
}

// "smittenkitchen.com" from a link, or "" if the link can't be read.
export function siteName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function totalMinutes(recipe: Recipe) {
  return (recipe.prepMin ?? 0) + (recipe.cookMin ?? 0);
}

// The source line on cards and the recipe view: the website or cookbook when there is one,
// otherwise how the recipe got here.
export function sourceLabel(recipe: Recipe): { kind: "link" | "hand" | "photo" | "typed"; text: string } {
  if (recipe.sourceName) return { kind: recipe.sourceUrl ? "link" : "typed", text: recipe.sourceName };
  switch (recipe.source) {
    case "scribble":
    case "pencil":
      return { kind: "hand", text: "Written by hand" };
    case "scan":
    case "upload":
      return { kind: "photo", text: "From a photo" };
    default:
      return { kind: "typed", text: "From my recipe book" };
  }
}
