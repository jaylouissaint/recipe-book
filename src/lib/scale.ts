import type { Ingredient } from "./types";

// The serving scaler (docs/DESIGN.md "Recipe view"): amounts as cooks write them ("1/3", "1 1/2",
// "½", "2-3", "1.5") times a factor, written back the same way with kitchen fractions.

const UNICODE: Record<string, number> = { "½": 1 / 2, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 1 / 4, "¾": 3 / 4, "⅛": 1 / 8 };

// "1 1/2" -> 1.5, "½" -> 0.5, "1½" -> 1.5, "1.5" -> 1.5, "1,5" -> 1.5; null if it isn't a number.
export function readAmount(text: string): number | null {
  const t = text.trim();
  let m = /^(\d+)?\s*([½⅓⅔¼¾⅛])$/.exec(t);
  if (m) return Number(m[1] ?? 0) + UNICODE[m[2]];
  m = /^(?:(\d+)\s+)?(\d+)\/(\d+)$/.exec(t);
  if (m) return Number(m[3]) === 0 ? null : Number(m[1] ?? 0) + Number(m[2]) / Number(m[3]);
  m = /^\d+(?:[.,]\d+)?$/.exec(t);
  if (m) return Number(t.replace(",", "."));
  return null;
}

// Kitchen fractions an amount is rounded to, when it's close to one.
const FRACTIONS: [number, string][] = [
  [1 / 8, "1/8"], [1 / 6, "1/6"], [1 / 4, "1/4"], [1 / 3, "1/3"], [1 / 2, "1/2"], [2 / 3, "2/3"], [3 / 4, "3/4"],
];

// 1.5 -> "1 1/2", 0.333 -> "1/3", 2 -> "2", 0.6 -> "0.6".
export function writeAmount(n: number): string {
  if (n <= 0) return "0";
  const whole = Math.floor(n + 1e-9);
  const rest = n - whole;
  if (rest < 0.04) return String(whole);
  if (rest > 0.96) return String(whole + 1);
  const near = FRACTIONS.find(([f]) => Math.abs(rest - f) < 0.02);
  if (near) return whole ? `${whole} ${near[1]}` : near[1];
  // Not a kitchen fraction: one decimal place (two below 1).
  const decimals = n < 1 ? 2 : 1;
  return String(Number(n.toFixed(decimals)));
}

// "2-3" ranges scale at both ends; amounts that aren't numbers ("a few") stay as written.
export function scaleQuantity(quantity: string, factor: number): string {
  if (factor === 1 || !quantity.trim()) return quantity;
  const range = /^(.+?)\s*-\s*(.+)$/.exec(quantity.trim());
  if (range) {
    const [a, b] = [readAmount(range[1]), readAmount(range[2])];
    if (a != null && b != null) return `${writeAmount(a * factor)}-${writeAmount(b * factor)}`;
  }
  const n = readAmount(quantity);
  return n == null ? quantity : writeAmount(n * factor);
}

export function scaleIngredient(i: Ingredient, factor: number): Ingredient {
  return { ...i, quantity: scaleQuantity(i.quantity, factor) };
}
