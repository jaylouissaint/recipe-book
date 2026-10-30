import { BOOK_TAG_LABELS } from "./book.ts"; // extensions so node --test can run this file
import { type DirectionLine, linesToStepGroups, parseIngredientLine } from "./parse.ts";
import type { IngredientGroup, StepGroup } from "./types";

// "Paste text" on the writing page (docs/DESIGN.md "Add from photos"): a recipe's text, copied
// with Live Text from a photo or from anywhere else, sorted into the page by simple rules. No AI.
// The test cases are in shared/fixtures/pasted-recipes.json.

export type PastedRecipe = {
  title: string;
  servings: number | null;
  prepMin: number | null;
  cookMin: number | null;
  ingredientGroups: IngredientGroup[];
  stepGroups: StepGroup[];
  notes: string;
};

type Section = "head" | "ingredients" | "directions" | "notes";

const HEADINGS: [Section, RegExp][] = [
  ["ingredients", /^(ingredients?|you(?:'|’)ll need|what you(?:'|’)ll need|what you need)\s*:?$/i],
  ["directions", /^(directions?|instructions?|method|steps?|preparation|how to make (?:it|this))\s*:?$/i],
  ["notes", /^(notes?|tips?|cook(?:'|’)?s notes?)\s*:?$/i],
];

const BULLET = /^(?:[•·*▢□☐◻○◦]|o(?=\s))\s*/;
const STEP_MARK = /^(?:[▷►▶>]|\d{1,2}\s*[.)]|step\s*\d+\s*[:.)]?)\s*/i;
const SUB_MARK = /^[-–—•*]\s*/;
// Words that make a short line an ingredient ("salt", "fresh basil"), not a section name.
const INGREDIENTISH = /\b(of|salt|pepper|taste|garnish|optional|oil|water|butter|sugar|fresh|chopped)\b/i;

function heading(line: string): Section | null {
  for (const [section, re] of HEADINGS) if (re.test(line)) return section;
  return null;
}

function hasQuantity(line: string) {
  return parseIngredientLine(line.replace(BULLET, "")).quantity !== "";
}

// "1 hr 20 min", "45 min", "1 hour", "30" -> minutes.
export function readDuration(text: string): number | null {
  const h = /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)\b/i.exec(text);
  const m = /(\d+)\s*(?:m|min|mins|minutes?)\b/i.exec(text);
  if (h || m) return Math.round((h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0));
  const n = /^\s*(\d+)\s*$/.exec(text);
  return n ? Number(n[1]) : null;
}

// "1 hr 5 mins", "45 min", "20": longer unit names first so "hr" isn't read as "h".
const DURATION = String.raw`[\d.]+\s*(?:hours?|hrs|hr|h|minutes?|mins|min|m)?\b(?:\s*\d+\s*(?:minutes?|mins|min|m)\b)?`;

// Reads the stats on one line ("Serves 4", "Prep time: 15 min"); returns whether it found any.
function readStats(line: string, out: PastedRecipe): boolean {
  let found = false;
  const serves = /\b(?:serves|servings?|yield|makes)\s*:?\s*(\d+)/i.exec(line) ?? /^(\d+)\s+servings?\b/i.exec(line);
  if (serves) {
    out.servings ??= Number(serves[1]);
    found = true;
  }
  const prep = new RegExp(String.raw`\bprep(?:aration)?(?:\s*time)?\s*:?\s*(${DURATION})`, "i").exec(line);
  if (prep) {
    out.prepMin ??= readDuration(prep[1]);
    found = true;
  }
  const cook = new RegExp(String.raw`\b(?:cook|bake|baking|cooking)(?:\s*time)?\s*:?\s*(${DURATION})`, "i").exec(line);
  if (cook) {
    out.cookMin ??= readDuration(cook[1]);
    found = true;
  }
  return found;
}

// The book page's tag checkboxes ("o QUICK & EASY o SLOW COOKER"): skipped.
function isTagLine(line: string) {
  const upper = line.toUpperCase();
  return BOOK_TAG_LABELS.some((label) => upper.includes(label.toUpperCase()));
}

function groupName(line: string, prev: string | undefined, next: string | undefined): string | null {
  const text = line.replace(BULLET, "");
  if (/:$/.test(text) && !hasQuantity(text)) return text.replace(/:$/, "").replace(/^for (?:the )?/i, "").trim();
  if (/^for (?:the )?\S/i.test(text) && !hasQuantity(text)) return text.replace(/^for (?:the )?/i, "").trim();
  if (hasQuantity(text) || !next || !hasQuantity(next)) return null;
  if (text.length > 2 && text === text.toUpperCase() && /[A-Z]/.test(text)) return text.toLowerCase();
  // A short line on its own, right before an amount, as on the book page ("marinade").
  if (prev === undefined || prev === "") {
    if (text.split(/\s+/).length <= 4 && !INGREDIENTISH.test(text)) return text;
  }
  return null;
}

function ingredientsFrom(lines: string[]): IngredientGroup[] {
  const groups: IngredientGroup[] = [{ name: "", items: [] }];
  lines.forEach((line, i) => {
    if (!line) return;
    const name = groupName(line, lines[i - 1], lines.slice(i + 1).find(Boolean));
    if (name !== null) {
      groups.push({ name, items: [] });
      return;
    }
    groups[groups.length - 1].items.push(parseIngredientLine(line.replace(BULLET, "")));
  });
  return groups.filter((g) => g.items.length > 0);
}

// ▷ / 1. / Step 1 start a step and "-" a sub-step. When there are marks, a line without one
// continues the line above it (text that wrapped); with no marks at all, every line is a step.
function directionsFrom(lines: string[]): StepGroup[] {
  const text = lines.filter(Boolean);
  const marked = text.some((l) => STEP_MARK.test(l) || SUB_MARK.test(l));
  const out: DirectionLine[] = [];
  for (const line of text) {
    if (!marked) out.push({ kind: "step", text: line });
    else if (STEP_MARK.test(line)) out.push({ kind: "step", text: line.replace(STEP_MARK, "") });
    else if (SUB_MARK.test(line)) out.push({ kind: "sub", text: line.replace(SUB_MARK, "") });
    else if (out.length) out[out.length - 1].text += ` ${line}`;
    else out.push({ kind: "step", text: line });
  }
  return linesToStepGroups(out);
}

export function parseRecipeText(text: string): PastedRecipe {
  const out: PastedRecipe = {
    title: "",
    servings: null,
    prepMin: null,
    cookMin: null,
    ingredientGroups: [],
    stepGroups: [],
    notes: "",
  };
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .map((l) => (/^[^\p{L}\p{N}]+$/u.test(l) ? "" : l)); // a lone "*" or bullet counts as blank

  const sections: Record<Section, string[]> = { head: [], ingredients: [], directions: [], notes: [] };
  let section: Section = "head";
  for (const line of lines) {
    const h = heading(line);
    if (h) section = h;
    else sections[section].push(line);
  }

  // With no headings, amounts are ingredients until the first line that isn't one.
  if (!sections.ingredients.length && !sections.directions.length) {
    const head = sections.head;
    const first = head.findIndex((l) => hasQuantity(l));
    if (first >= 0) {
      const rest = head.slice(first);
      const end = rest.findIndex((l, i) => l !== "" && !hasQuantity(l) && groupName(l, rest[i - 1], rest[i + 1]) === null);
      sections.head = head.slice(0, first);
      sections.ingredients = end < 0 ? rest : rest.slice(0, end);
      sections.directions = end < 0 ? [] : rest.slice(end);
    }
  }

  // Head: the title, stats and the book page's tag boxes.
  const head = sections.head.filter(Boolean);
  for (let i = 0; i < head.length; i++) {
    const line = head[i];
    // The book page's stat box comes through as its labels, then its values: "4 45 min 15 min".
    if (/^servings\s+prep\s*time\s+cook\s*time$/i.test(line)) {
      const values = [...(head[i + 1] ?? "").matchAll(/(\d+)\s*(?:min)?/gi)].map((m) => Number(m[1]));
      if (values.length >= 3) [out.servings, out.prepMin, out.cookMin] = values;
      i++;
      continue;
    }
    if (isTagLine(line) || readStats(line, out)) continue;
    if (!out.title) {
      const book = /^recipe\s*:\s*/i.exec(line);
      out.title = line.replace(/^recipe\s*:\s*/i, "");
      // A handwritten title that wraps onto a second line
      const nextLine = head[i + 1];
      if (book && nextLine && /^\p{Ll}/u.test(nextLine) && !isTagLine(nextLine)) {
        out.title += ` ${nextLine}`;
        i++;
      }
    }
  }

  out.ingredientGroups = ingredientsFrom(sections.ingredients);
  out.stepGroups = directionsFrom(sections.directions);
  out.notes = sections.notes.filter(Boolean).join("\n");
  return out;
}
