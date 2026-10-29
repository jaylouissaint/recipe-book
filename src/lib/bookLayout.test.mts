import assert from "node:assert/strict";
import { test } from "node:test";
import { type Block, pack, recipeBlocks, splitColumns } from "./bookLayout.ts";
import type { Recipe } from "./types";

const b = (kind: Block["kind"], key: string) => ({ kind, key }) as Block;
const linesOf = (sizes: Record<string, number>) => (x: Block) => sizes[x.key] ?? 1;

test("blocks that fit stay on one page", () => {
  const blocks = [b("header", "h"), b("gap", "g"), b("ingredients", "i")];
  assert.deepEqual(pack(blocks, linesOf({ h: 4, i: 9 }), 20).map((p) => p.map((x) => x.key)), [["h", "g", "i"]]);
});

test("overflow continues on a new page that starts with the continued line", () => {
  const blocks = [b("header", "h"), b("dirLine", "d1"), b("dirLine", "d2"), b("dirLine", "d3")];
  const pages = pack(blocks, linesOf({ h: 3, d1: 1, d2: 1, d3: 1 }), 5, b("continued", "c"));
  assert.deepEqual(pages.map((p) => p.map((x) => x.key)), [["h", "d1", "d2"], ["c", "d3"]]);
});

test("a label moves with the line after it, and gaps never start a page", () => {
  const blocks = [b("ingredients", "i"), b("gap", "g"), b("dirLabel", "L"), b("dirLine", "d1")];
  const pages = pack(blocks, linesOf({ i: 4 }), 6, b("continued", "c"));
  assert.deepEqual(pages.map((p) => p.map((x) => x.key)), [["i", "g"], ["c", "L", "d1"]]);
});

test("a block taller than a page still gets a page of its own", () => {
  const pages = pack([b("ingredients", "i"), b("dirLine", "d")], linesOf({ i: 30 }), 20);
  assert.deepEqual(pages.map((p) => p.map((x) => x.key)), [["i"], ["d"]]);
});

const item = (t: string) => ({ quantity: "", unit: "", item: t });
const text = (col: { kind: string; text: string }[]) => col.filter((l) => l.kind !== "pad").map((l) => l.text || "_");

test("two groups split like the sweet chili chicken page", () => {
  const [left, right] = splitColumns(
    [
      { name: "marinade", items: "abcdefg".split("").map(item) },
      { name: "drizzle", items: "hijklm".split("").map(item) },
      { name: "", items: [item("rice")] },
    ],
    (i) => i.item,
  );
  assert.deepEqual(text(left), ["marinade", "a", "b", "c", "d", "e", "f", "g"]);
  assert.deepEqual(text(right), ["drizzle", "h", "i", "j", "k", "l", "m", "_", "rice", "_"]);
  assert.equal(left.length, right.length);
});

test("one long group is split across both columns", () => {
  const [left, right] = splitColumns([{ name: "stew", items: "abcdefghijkl".split("").map(item) }], (i) => i.item);
  assert.deepEqual(text(left), ["stew", "a", "b", "c", "d", "e", "f"]);
  assert.deepEqual(text(right), ["g", "h", "i", "j", "k", "l", "_"]);
});

test("a recipe written only on the Pencil page shows its handwritten page", () => {
  const r = { id: "r", title: "soup", tags: [], ingredientGroups: [], stepGroups: [], handwritingPath: "r/page.png" } as unknown as Recipe;
  assert.deepEqual(recipeBlocks(r).map((x) => x.kind), ["header", "gap", "handwriting"]);
  const typed = { ...r, stepGroups: [{ title: "simmer", steps: [] }] } as Recipe;
  assert.ok(!recipeBlocks(typed).some((x) => x.kind === "handwriting"));
});
