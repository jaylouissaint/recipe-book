import { parseIngredientLine } from "./parse.ts"; // extension so node --test can run this file
import type { IngredientGroup, StepGroup } from "./types";

// "Save from the web" (docs/DESIGN.md): most recipe sites publish their recipe as schema.org
// data (JSON-LD) for search engines. This reads it; no AI. A page without it still gives a title,
// photo and site name from its meta tags.

export type WebRecipe = {
  found: boolean; // false: only the page's title, photo and site name were found
  title: string;
  description: string;
  author: string;
  sourceName: string;
  imageUrl: string;
  servings: number | null;
  prepMin: number | null;
  cookMin: number | null;
  category: string;
  tags: string[];
  ingredientGroups: IngredientGroup[];
  stepGroups: StepGroup[];
};

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type Obj = { [k: string]: Json };

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", deg: "°", times: "×", frasl: "⁄",
  frac12: "½", frac13: "⅓", frac23: "⅔", frac14: "¼", frac34: "¾", frac18: "⅛",
  eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", aacute: "á", ntilde: "ñ", ouml: "ö", uuml: "ü", ccedil: "ç",
};

function decode(s: string): string {
  for (let i = 0; i < 2 && s.includes("&"); i++) {
    s = s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1));
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    });
  }
  return s;
}

// Plain text from a value that may hold HTML; line breaks kept where the HTML had them.
function text(v: Json | undefined, keepLines = false): string {
  if (typeof v === "number") return String(v);
  if (typeof v !== "string") return "";
  let s = decode(v)
    .replace(/<br\s*\/?>|<\/(p|li|div|h\d)>/gi, "\n")
    .replace(/<[^>]*>/g, "");
  s = decode(s); // some sites encode twice
  const lines = s.split(/\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  return keepLines ? lines.join("\n") : lines.join(" ");
}

function list(v: Json | undefined): Json[] {
  return v == null ? [] : Array.isArray(v) ? v : [v];
}

function isObj(v: Json | undefined): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function hasType(o: Obj, type: string) {
  return list(o["@type"]).some((t) => typeof t === "string" && t.replace(/^.*[/:]/, "") === type);
}

function findRecipe(v: Json, depth = 0): Obj | null {
  if (depth > 8) return null;
  if (Array.isArray(v)) {
    for (const x of v) {
      const r = findRecipe(x, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (!isObj(v)) return null;
  if (hasType(v, "Recipe")) return v;
  for (const k of ["@graph", "mainEntity", "mainEntityOfPage", "itemListElement", "item"]) {
    if (v[k] != null) {
      const r = findRecipe(v[k], depth + 1);
      if (r) return r;
    }
  }
  return null;
}

function jsonLd(html: string): Json[] {
  const out: Json[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    const raw = m[1].trim().replace(/^<!--|-->$/g, "").replace(/^\/\/\s*<!\[CDATA\[|\/\/\s*\]\]>$/g, "").trim();
    try {
      out.push(JSON.parse(raw));
    } catch {
      // Some sites put raw line breaks inside strings
      try {
        out.push(JSON.parse(raw.replace(/[\n\r\t]+/g, " ")));
      } catch {
        // unreadable block: skip it
      }
    }
  }
  return out;
}

function meta(html: string, name: string): string {
  const tag = new RegExp(`<meta\\b[^>]*(?:property|name)\\s*=\\s*["']${name}["'][^>]*>`, "i").exec(html)?.[0];
  return text(tag ? /content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i.exec(tag)?.slice(1).find((x) => x != null) : "");
}

function absolute(url: string, base: string): string {
  if (!url) return "";
  try {
    const u = new URL(url, base);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : "";
  } catch {
    return "";
  }
}

// ISO 8601 durations: "PT1H30M" -> 90.
export function isoMinutes(v: Json | undefined): number | null {
  const m = typeof v === "string" ? /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i.exec(v.trim()) : null;
  if (!m || !m.slice(1).some(Boolean)) return null;
  const [d, h, min, s] = m.slice(1).map((x) => Number(x ?? 0));
  const total = Math.round(d * 1440 + h * 60 + min + s / 60);
  return total > 0 ? total : null;
}

function names(v: Json | undefined): string {
  return list(v)
    .map((a) => (isObj(a) ? text(a.name) : text(a)))
    .filter(Boolean)
    .join(" & ");
}

function image(v: Json | undefined, base: string): string {
  for (const i of list(v)) {
    const url = isObj(i) ? text(i.url) || text(i.contentUrl) : text(i);
    const abs = url && absolute(url, base);
    if (abs) return abs;
  }
  return "";
}

function stepText(s: string) {
  return s.replace(/^(?:step\s*)?\d{1,2}\s*[.):]\s+/i, "");
}

function instructions(v: Json | undefined): StepGroup[] {
  const groups: StepGroup[] = [];
  for (const x of list(v)) {
    if (typeof x === "string") {
      for (const line of text(x, true).split("\n")) if (line) groups.push({ title: stepText(line), steps: [] });
    } else if (isObj(x) && (hasType(x, "HowToSection") || (x.itemListElement != null && !hasType(x, "HowToStep")))) {
      // A titled section, as on the book page: ▷ the section, then "–" its steps.
      const steps = instructions(x.itemListElement).flatMap((g) => [g.title, ...g.steps]);
      const title = text(x.name);
      if (title) groups.push({ title, steps });
      else groups.push(...steps.map((s) => ({ title: s, steps: [] })));
    } else if (isObj(x)) {
      const body = stepText(text(x.text));
      const name = stepText(text(x.name));
      if (name && body && body !== name && !body.startsWith(name.replace(/\.+$/, ""))) groups.push({ title: name, steps: [body] });
      else if (body || name) groups.push({ title: body || name, steps: [] });
    }
  }
  return groups;
}

function category(o: Obj): string {
  const c = list(o.recipeCategory).map((x) => text(x)).join(" ").toLowerCase();
  if (/dessert|cake|cookie|pie\b|sweet|bak(e|ing)|brownie|candy|pudding/.test(c)) return "desserts";
  if (/\bsides?\b|salad|vegetable|side dish/.test(c)) return "sides";
  if (/main|dinner|entr[eé]e|lunch|supper/.test(c)) return "mains";
  if (c) return "more";
  return "mains";
}

const TAG_WORDS: [string, RegExp][] = [
  ["slow-cooker", /slow[- ]cooker|crock ?pot/],
  ["pressure-cooker", /pressure cooker|instant pot/],
  ["air-fryer", /air[- ]fr(y|ie)er/],
  ["one-pot", /one[- ](pot|pan)|sheet pan/],
  ["make-ahead", /make[- ]ahead/],
  ["vegan", /\bvegan/],
  ["veg", /vegetarian/],
  ["gluten-free", /gluten[- ]free/],
  ["dairy-free", /dairy[- ]free/],
  ["nut-free", /nut[- ]free/],
];

function tags(o: Obj): string[] {
  const words = [
    ...list(o.keywords).map((x) => text(x)),
    ...list(o.suitableForDiet).map((x) => text(x).replace(/^.*\//, "").replace(/Diet$/, "").replace(/([a-z])([A-Z])/g, "$1 $2")),
  ]
    .join(", ")
    .toLowerCase();
  return TAG_WORDS.filter(([, re]) => re.test(words)).map(([id]) => id);
}

export function recipeFromHtml(html: string, pageUrl: string): WebRecipe {
  const site = meta(html, "og:site_name");
  let host = "";
  try {
    host = new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {}
  const empty: WebRecipe = {
    found: false,
    title: meta(html, "og:title") || text(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]),
    description: meta(html, "og:description") || meta(html, "description"),
    author: meta(html, "author"),
    sourceName: site || host,
    imageUrl: absolute(meta(html, "og:image"), pageUrl),
    servings: null,
    prepMin: null,
    cookMin: null,
    category: "mains",
    tags: [],
    ingredientGroups: [],
    stepGroups: [],
  };

  const r = jsonLd(html).map((j) => findRecipe(j)).find(Boolean);
  if (!r) return empty;

  const prepMin = isoMinutes(r.prepTime);
  const total = isoMinutes(r.totalTime);
  const cookMin = isoMinutes(r.cookTime) ?? (total != null && total > (prepMin ?? 0) ? total - (prepMin ?? 0) : null);
  const yields = list(r.recipeYield).map((y) => text(y)).join(" ");
  const servings = /\d+/.exec(yields)?.[0];
  const publisher = list(r.publisher).find(isObj);

  return {
    found: true,
    title: text(r.name) || empty.title,
    description: text(r.description) || empty.description,
    author: names(r.author) || empty.author,
    sourceName: site || (publisher ? text(publisher.name) : "") || host,
    imageUrl: image(r.image, pageUrl) || empty.imageUrl,
    servings: servings ? Number(servings) : null,
    prepMin,
    cookMin,
    category: category(r),
    tags: tags(r),
    ingredientGroups: [
      {
        name: "",
        items: list(r.recipeIngredient ?? r.ingredients)
          .map((i) => text(i).replace(/^[▢□☐]\s*/, ""))
          .filter(Boolean)
          .map(parseIngredientLine),
      },
    ].filter((g) => g.items.length > 0),
    stepGroups: instructions(r.recipeInstructions),
  };
}
