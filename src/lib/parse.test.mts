import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ingredientLine, linesToStepGroups, parseIngredientLine, readDirectionLine, stepGroupsToLines } from "./parse.ts";

// Shared with the iPad app's Swift tests (docs/APP_PLAN.md).
const fixtures: { line: string; quantity: string; unit: string; item: string }[] = JSON.parse(
  readFileSync(new URL("../../shared/fixtures/ingredient-lines.json", import.meta.url), "utf8"),
);

test("ingredient lines from the shared fixtures", () => {
  for (const f of fixtures) {
    assert.deepEqual(parseIngredientLine(f.line), { quantity: f.quantity, unit: f.unit, item: f.item }, f.line);
  }
});

test("a parsed line reads back as written", () => {
  for (const line of ["1/3 c sweet chili sauce", "2 garlic cloves (minced)", "pinch of salt", "1 1/2 cups flour"]) {
    assert.equal(ingredientLine(parseIngredientLine(line)), line);
  }
});

test("directions: dashes make sub-steps, groups round-trip", () => {
  const lines = [
    readDirectionLine("cook chicken", "step"),
    readDirectionLine("- heat grill pan over medium high heat", "step"),
    readDirectionLine("– lightly oil the surface", "step"),
    readDirectionLine(" ", "sub"),
    readDirectionLine("assemble the bowls", "step"),
    readDirectionLine("", "sub"),
  ];
  const groups = linesToStepGroups(lines);
  assert.deepEqual(groups, [
    { title: "cook chicken", steps: ["heat grill pan over medium high heat", "lightly oil the surface"] },
    { title: "assemble the bowls", steps: [] },
  ]);
  assert.deepEqual(linesToStepGroups(stepGroupsToLines(groups)), groups);
});

test("a sub-step before any step becomes a step", () => {
  assert.deepEqual(linesToStepGroups([{ kind: "sub", text: "preheat oven" }]), [{ title: "preheat oven", steps: [] }]);
});
