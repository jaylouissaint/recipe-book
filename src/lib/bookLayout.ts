import { CATEGORIES } from "./book.ts"; // extension so node --test can run this file
import type { IngredientGroup, Recipe } from "./types";

// The book view (docs/DESIGN.md "Book view"): every page is the same size and holds a whole number
// of ruled lines. Each recipe becomes a list of blocks measured in lines, and blocks are packed
// onto pages; a recipe that doesn't fit continues on the next page.

export type Line = { kind: "name" | "item" | "blank" | "pad"; text: string };

export type Block =
  | { kind: "header"; key: string; recipe: Recipe }
  | { kind: "continued"; key: string; recipe: Recipe }
  | { kind: "ingredients"; key: string; recipe: Recipe }
  | { kind: "ingLabel"; key: string; recipe: Recipe }
  | { kind: "ingRow"; key: string; recipe: Recipe; line: Line }
  | { kind: "dirLabel"; key: string; recipe: Recipe }
  | { kind: "dirLine"; key: string; recipe: Recipe; sub: boolean; text: string }
  | { kind: "notesLabel"; key: string; recipe: Recipe }
  | { kind: "notes"; key: string; recipe: Recipe; text: string }
  | { kind: "gap"; key: string }
  | { kind: "contentsTitle"; key: string }
  | { kind: "contentsCategory"; key: string; slug: string }
  | { kind: "contentsEntry"; key: string; recipe: Recipe };

export type Page =
  | { kind: "cover" }
  | { kind: "contents"; blocks: Block[]; number: number }
  | { kind: "recipe"; recipe: Recipe; blocks: Block[]; number: number; first: boolean }
  | { kind: "blank"; number: number };

// Labels stay on the same page as the line after them.
const KEEP_WITH_NEXT = new Set<Block["kind"]>(["dirLabel", "notesLabel", "contentsCategory", "ingLabel"]);

// On narrow pages ingredients are one column, one block per line, so a long list continues on the
// next page; on wider pages they're one two-column block, like the book.
export function recipeBlocks(r: Recipe, narrow = false, format: (i: Recipe["ingredientGroups"][number]["items"][number]) => string = (i) => i.item): Block[] {
  const ingredients: Block[] = narrow
    ? [
        { kind: "ingLabel", key: `${r.id}:ingLabel`, recipe: r },
        ...splitColumns(r.ingredientGroups, format)
          .flat()
          .filter((l) => l.kind !== "pad")
          .map((line, i) => ({ kind: "ingRow" as const, key: `${r.id}:ing:${i}`, recipe: r, line })),
      ]
    : [{ kind: "ingredients", key: `${r.id}:ingredients`, recipe: r }];
  const blocks: Block[] = [
    { kind: "header", key: `${r.id}:header`, recipe: r },
    { kind: "gap", key: `${r.id}:gap1` },
    ...ingredients,
    { kind: "gap", key: `${r.id}:gap2` },
    { kind: "dirLabel", key: `${r.id}:dirLabel`, recipe: r },
  ];
  r.stepGroups.forEach((g, i) => {
    blocks.push({ kind: "dirLine", key: `${r.id}:dir:${i}`, recipe: r, sub: false, text: g.title });
    g.steps.forEach((s, j) =>
      blocks.push({ kind: "dirLine", key: `${r.id}:dir:${i}:${j}`, recipe: r, sub: true, text: s }),
    );
  });
  if (r.notes) {
    blocks.push(
      { kind: "gap", key: `${r.id}:gap3` },
      { kind: "notesLabel", key: `${r.id}:notesLabel`, recipe: r },
      ...r.notes
        .split(/\n+/)
        .filter((t) => t.trim())
        .map((text, i) => ({ kind: "notes" as const, key: `${r.id}:notes:${i}`, recipe: r, text })),
    );
  }
  return blocks;
}

export function continuedBlock(r: Recipe): Block {
  return { kind: "continued", key: `${r.id}:continued`, recipe: r };
}

// Recipes in book order: by category (the side tabs' order), then title.
export function bookOrder(recipes: Recipe[]): Recipe[] {
  const rank = (slug: string) => {
    const i = CATEGORIES.findIndex((c) => c.slug === slug);
    return i < 0 ? CATEGORIES.length : i;
  };
  return [...recipes].sort((a, b) => rank(a.category) - rank(b.category) || a.title.localeCompare(b.title));
}

export function contentsBlocks(recipes: Recipe[]): Block[] {
  const blocks: Block[] = [{ kind: "contentsTitle", key: "contents:title" }];
  for (const c of CATEGORIES) {
    const inCategory = recipes.filter((r) => r.category === c.slug);
    if (inCategory.length === 0) continue;
    blocks.push({ kind: "contentsCategory", key: `contents:${c.slug}`, slug: c.slug });
    inCategory.forEach((r) => blocks.push({ kind: "contentsEntry", key: `contents:${r.id}`, recipe: r }));
  }
  return blocks;
}

// Packs blocks (each `lines` tall) onto pages of `capacity` lines. Gaps at the top of a page are
// dropped, a keep-with-next block moves to the next page together with the block after it, and
// every page after the first starts with `continued` (if given).
export function pack(blocks: Block[], lines: (b: Block) => number, capacity: number, continued?: Block): Block[][] {
  const pages: Block[][] = [];
  let page: Block[] = [];
  let used = 0;
  const atTop = () => page.length === (continued && pages.length ? 1 : 0);
  blocks.forEach((b, i) => {
    if (b.kind === "gap" && atTop()) return;
    const next = blocks[i + 1];
    const need = lines(b) + (KEEP_WITH_NEXT.has(b.kind) && next ? lines(next) : 0);
    if (used + need > capacity && !atTop()) {
      pages.push(page);
      page = continued ? [continued] : [];
      used = continued ? lines(continued) : 0;
      if (b.kind === "gap") return;
    }
    page.push(b);
    used += lines(b);
  });
  if (page.length) pages.push(page);
  return pages;
}

// Ingredient groups split into two balanced columns, as on the book page: the left column takes
// the first half of the lines (a blank line between groups), never ending on a group name or a
// blank. Both columns are padded to the same height plus one spare line.
export function splitColumns(groups: IngredientGroup[], format: (i: IngredientGroup["items"][number]) => string): [Line[], Line[]] {
  const all: Line[] = [];
  groups.forEach((g) => {
    if (all.length) all.push({ kind: "blank", text: "" });
    if (g.name) all.push({ kind: "name", text: g.name });
    g.items.forEach((i) => all.push({ kind: "item", text: format(i) }));
  });
  let cut = Math.ceil(all.length / 2);
  while (cut > 0 && (all[cut - 1].kind === "name" || all[cut - 1].kind === "blank")) cut--;
  const left = all.slice(0, cut);
  const right = all.slice(cut);
  while (right[0]?.kind === "blank") right.shift();
  const height = Math.max(left.length, right.length) + 1;
  for (const col of [left, right]) {
    while (col.length < height) col.push({ kind: "pad", text: "" });
  }
  right[right.length - 1].kind = "blank";
  return [left, right];
}
