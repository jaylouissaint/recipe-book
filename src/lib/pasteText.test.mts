import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseRecipeText, readDuration } from "./pasteText.ts";

// Shared with the iPad app's Swift tests (docs/APP_PLAN.md).
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
