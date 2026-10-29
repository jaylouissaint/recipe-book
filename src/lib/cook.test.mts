import assert from "node:assert/strict";
import { test } from "node:test";
import { ingredientsForStep } from "./cook.ts";
import { parseIngredientLine } from "./parse.ts";

const groups = [
  {
    name: "marinade",
    items: ["2 lbs chicken thighs", "1/3 c sweet chili sauce", "2 TB soy sauce", "1 TB sesame oil", "1 TB lime juice"].map(parseIngredientLine),
  },
  {
    name: "coconut lime drizzle",
    items: ["1/2 c canned coconut milk", "2 TB mayo", "1 TB sriracha", "pinch of salt"].map(parseIngredientLine),
  },
  { name: "", items: ["2c cooked rice"].map(parseIngredientLine) },
];
const items = (step: { title: string; steps: string[] }) => ingredientsForStep(groups, step).map((i) => i.item);

test("a step gets the ingredients it names", () => {
  assert.deepEqual(items({ title: "marinate chicken at least 30 min", steps: [] }), ["chicken thighs"]);
});

test("a step that names a section gets the whole section", () => {
  const got = items({ title: "make coconut lime drizzle", steps: ["whisk together coconut milk, mayo, sriracha"] });
  assert.ok(["canned coconut milk", "mayo", "sriracha", "pinch of salt"].every((i) => got.includes(i)));
  assert.ok(!got.includes("chicken thighs"));
});

test("an ingredient in the named section isn't repeated from another section", () => {
  const drizzle = { ...groups[1], items: [...groups[1].items, parseIngredientLine("1 TB lime juice")] };
  const got = ingredientsForStep([groups[0], drizzle], { title: "make coconut lime drizzle", steps: ["add the lime juice"] });
  assert.equal(got.filter((i) => i.item === "lime juice").length, 1);
});

test("plural and singular match, describing words don't", () => {
  assert.deepEqual(items({ title: "top rice with chicken", steps: [] }), ["chicken thighs", "cooked rice"]);
  assert.deepEqual(items({ title: "let it rest", steps: ["slice when cooked"] }), []);
});
