import assert from "node:assert/strict";
import { test } from "node:test";
import { notMadeLately } from "./lately.ts";
import type { Recipe } from "./types";

const now = Date.parse("2026-10-30T12:00:00Z");
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();
const r = (id: string, over: Partial<Recipe> = {}) => ({ id, title: id, tags: [], timesCooked: 0, ...over }) as Recipe;

test("favorites and cooked recipes not made in three weeks, longest ago first", () => {
  const recipes = [
    r("recent", { timesCooked: 3, lastCookedAt: daysAgo(5) }),
    r("five-weeks", { timesCooked: 1, lastCookedAt: daysAgo(36) }),
    r("four-months", { timesCooked: 2, lastCookedAt: daysAgo(125) }),
    r("cooked-before-dates", { timesCooked: 4 }),
    r("favorite-never-made", { tags: ["family-favorite"] }),
    r("never-cooked"),
    r("planned", { timesCooked: 1, lastCookedAt: daysAgo(90) }),
  ];
  const got = notMadeLately(recipes, new Set(["planned"]), now);
  assert.deepEqual(got.map((x) => [x.recipe.id, x.label]), [
    ["cooked-before-dates", "made a while ago"],
    ["four-months", "last made 4 months ago"],
    ["five-weeks", "last made 5 weeks ago"],
    ["favorite-never-made", "not made yet"],
  ]);
});

test("at most eight", () => {
  const many = Array.from({ length: 12 }, (_, i) => r(`r${i}`, { timesCooked: 1, lastCookedAt: daysAgo(30 + i) }));
  assert.equal(notMadeLately(many, new Set(), now).length, 8);
});
