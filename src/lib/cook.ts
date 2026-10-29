import type { Ingredient, IngredientGroup, StepGroup } from "./types";

// Start Cooking (docs/DESIGN.md) shows the ingredients a step uses above it. Simple word rules,
// no AI: a step that names a section ("make coconut lime drizzle") gets that whole section, and an
// ingredient counts when one of its main words is in the step ("cook chicken" -> chicken thighs).

// Words that describe an ingredient rather than name it.
const SKIP = new Set([
  "a", "an", "and", "or", "of", "the", "to", "for", "with", "in", "into", "on", "at", "about",
  "fresh", "freshly", "chopped", "minced", "diced", "sliced", "grated", "ground", "crushed", "peeled",
  "canned", "large", "small", "medium", "whole", "softened", "melted", "cold", "warm", "hot", "room",
  "temperature", "finely", "roughly", "thinly", "plus", "extra", "more", "taste", "optional", "divided",
  "packed", "cooked", "raw", "boneless", "skinless", "pinch", "dash", "cup", "cups",
]);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2 && !SKIP.has(w));
}

// "tomatoes" and "tomato", "limes" and "lime" count as the same word.
function stem(w: string) {
  return w.replace(/(es|s)$/, "");
}

export function keyWords(i: Ingredient): string[] {
  return words(i.item);
}

export function ingredientsForStep(groups: IngredientGroup[], step: StepGroup): Ingredient[] {
  const text = [step.title, ...step.steps].join(" ").toLowerCase();
  const stepWords = new Set(words(text).map(stem));
  const named = (g: IngredientGroup) => g.name.trim() !== "" && text.includes(g.name.trim().toLowerCase());
  // Sections the step names come first, so their "lime juice" wins over another section's.
  const out: Ingredient[] = groups.filter(named).flatMap((g) => g.items);
  const seen = new Set(out.map((i) => i.item.toLowerCase()));
  for (const g of groups.filter((g) => !named(g))) {
    for (const i of g.items) {
      if (seen.has(i.item.toLowerCase())) continue;
      if (keyWords(i).some((w) => stepWords.has(stem(w)))) {
        out.push(i);
        seen.add(i.item.toLowerCase());
      }
    }
  }
  return out;
}
