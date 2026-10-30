import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseRecipeText, readDuration } from "./pasteText.ts";

// Cases in shared/fixtures.
const fixtures: { name: string; text: string; expected: unknown }[] = JSON.parse(
  readFileSync(new URL("../../shared/fixtures/pasted-recipes.json", import.meta.url), "utf8"),
);

for (const f of fixtures) {
  test(`pasted text: ${f.name}`, () => {
    assert.deepEqual(parseRecipeText(f.text), f.expected);
  });
}

test("durations", () => {
  assert.equal(readDuration("45 min"), 45);
  assert.equal(readDuration("1 hr 20 min"), 80);
  assert.equal(readDuration("1.5 hours"), 90);
  assert.equal(readDuration("30"), 30);
  assert.equal(readDuration("soon"), null);
});

test("text with no recipe in it fills nothing but a title", () => {
  const r = parseRecipeText("just a note to self");
  assert.equal(r.title, "just a note to self");
  assert.deepEqual(r.ingredientGroups, []);
  assert.deepEqual(r.stepGroups, []);
});

test("handwriting tidying leaves real names and amounts alone", () => {
  const r = parseRecipeText("Spice Rub\n1 tsp McCormick paprika\n2 0z feta\n30 almonds\n1 TB oil");
  assert.deepEqual(
    r.ingredientGroups[0].items.map((i) => [i.quantity, i.unit, i.item]),
    [
      ["1", "tsp", "McCormick paprika"],
      ["2", "oz", "feta"],
      ["30", "", "almonds"],
      ["1", "TB", "oil"],
    ],
  );
});

test("run-together lines split only at a clear new step", () => {
  const r = parseRecipeText("Soup\n2 c broth\n1 c heavy cream\nwhisk the broth and heavy cream then add salt and stir it all together slowly");
  assert.deepEqual(r.stepGroups.map((s) => s.title), ["whisk the broth and heavy cream then add salt and stir it all together slowly"]);
  const merged = parseRecipeText("Soup\n2 c broth\n1 tsp salt warm the broth gently over low heat mix in the salt");
  assert.deepEqual(merged.ingredientGroups[0].items.map((i) => i.item), ["broth", "salt warm the broth gently over low heat"]);
  assert.deepEqual(merged.stepGroups.map((s) => s.title), ["mix in the salt"]);
});
