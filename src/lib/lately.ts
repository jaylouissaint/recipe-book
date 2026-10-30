import { isFavorite } from "./book.ts"; // extensions so node --test can run this file
import type { Recipe } from "./types";

// "Haven't made in a while" on Home (docs/DESIGN.md "Home"): favorites and recipes cooked before
// that haven't been made in the last three weeks and aren't planned this week, longest ago first.
// Recipes cooked before dates were kept (no lastCookedAt) count as longest ago; favorites never
// cooked come last.

const DAY = 86_400_000;
export const RECENT_DAYS = 21;
const SHOWN = 8;

export type Lately = { recipe: Recipe; label: string };

export function notMadeLately(recipes: Recipe[], planned: Set<string>, now = Date.now()): Lately[] {
  const when = (r: Recipe) => (r.lastCookedAt ? Date.parse(r.lastCookedAt) : null);
  return recipes
    .filter((r) => (r.timesCooked > 0 || isFavorite(r)) && !planned.has(r.id))
    .filter((r) => {
      const t = when(r);
      return t === null || now - t >= RECENT_DAYS * DAY;
    })
    .sort((a, b) => rank(a, when(a)) - rank(b, when(b)))
    .slice(0, SHOWN)
    .map((recipe) => ({ recipe, label: label(recipe, when(recipe), now) }));
}

// Undated but cooked first, then oldest first, then never cooked.
function rank(r: Recipe, t: number | null) {
  if (t !== null) return t;
  return r.timesCooked > 0 ? -Infinity : Infinity;
}

function label(r: Recipe, t: number | null, now: number) {
  if (t === null) return r.timesCooked > 0 ? "made a while ago" : "not made yet";
  const days = Math.floor((now - t) / DAY);
  if (days < 60) return `last made ${Math.floor(days / 7)} weeks ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `last made ${months} months ago` : "last made over a year ago";
}
