import type { Ingredient, StepGroup } from "./types";

// Rule-based parsing for the writing page (FR-WRITE-003 / FR-WRITE-004). No AI: just patterns.

// Case matters: "T"/"TB"/"Tbsp" are tablespoons and "t"/"tsp" teaspoons, as cooks write them.
const UNITS = new Set([
  "c", "C", "cup", "cups",
  "T", "TB", "Tb", "Tbsp", "tbsp", "tbs", "Tbs", "tablespoon", "tablespoons",
  "t", "tsp", "teaspoon", "teaspoons",
  "lb", "lbs", "pound", "pounds", "oz", "ounce", "ounces",
  "g", "kg", "ml", "mL", "l", "L",
  "qt", "pt", "gal",
  "clove", "cloves", "pinch", "dash", "can", "cans", "stick", "sticks", "pkg", "slice", "slices",
]);

// 2 | 1/3 | 1 1/2 | ½ | 1½ | 1 ½ | 1-2 | 1.5
const QTY = String.raw`(?:\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?(?:\s+\d+\/\d+|\s?[½⅓⅔¼¾⅛])?|\d+\/\d+|[½⅓⅔¼¾⅛])`;
const LINE = new RegExp(String.raw`^(${QTY})\s*([A-Za-z]+)?\.?(?:\s+|$)(.*)$`);

// "1/3 c sweet chili sauce" -> { quantity: "1/3", unit: "c", item: "sweet chili sauce" }.
// A word right after the amount only counts as a unit if it's a known one, so
// "2 garlic cloves" keeps "garlic cloves" as the item. Lines without an amount ("pinch of salt")
// are all item.
export function parseIngredientLine(text: string): Ingredient {
  const line = text.trim().replace(/\s+/g, " ");
  const m = LINE.exec(line);
  if (!m) return { quantity: "", unit: "", item: line };
  const [, quantity, word = "", rest] = m;
  if (word && UNITS.has(word)) return { quantity: quantity.trim(), unit: word, item: rest.trim() };
  return { quantity: quantity.trim(), unit: "", item: [word, rest].filter(Boolean).join(" ").trim() };
}

// The line as the cook wrote it, for editing (no fraction characters swapped in).
export function ingredientLine({ quantity, unit, item }: Ingredient) {
  return [quantity, unit, item].filter(Boolean).join(" ");
}

// Directions on the writing page are a flat list of lines: ▷ steps and "–" sub-steps.
export type DirectionLine = { kind: "step" | "sub"; text: string };

// Typing "-" or "–" at the start of a line makes it a sub-step. Leading spaces are dropped
// (typing "- " leaves an empty sub-step ready for its text).
export function readDirectionLine(text: string, kind: DirectionLine["kind"]): DirectionLine {
  const m = /^\s*[-–—]\s*(.*)$/.exec(text);
  return m ? { kind: "sub", text: m[1] } : { kind, text: text.trimStart() };
}

export function linesToStepGroups(lines: DirectionLine[]): StepGroup[] {
  const groups: StepGroup[] = [];
  for (const { kind, text } of lines) {
    const t = text.trim();
    if (!t) continue;
    // A sub-step before any step becomes a step of its own.
    if (kind === "step" || groups.length === 0) groups.push({ title: t, steps: [] });
    else groups[groups.length - 1].steps.push(t);
  }
  return groups;
}

export function stepGroupsToLines(groups: StepGroup[]): DirectionLine[] {
  return groups.flatMap((g) => [
    { kind: "step" as const, text: g.title },
    ...g.steps.map((s) => ({ kind: "sub" as const, text: s })),
  ]);
}
