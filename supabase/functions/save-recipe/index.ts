// save-recipe: the only way to change the recipe books. Called by the website's server.
//
// There are two books, Ramiya's and Jay's (docs/HANDOFF.md "Who's using this"), each with its own
// write key: WRITE_KEY is Ramiya's and WRITE_KEY_JAY is Jay's. The key a request sends decides its
// book, and only that book can be changed: new rows go into it, and a change to an existing recipe,
// grocery item or meal in the other book is refused.
//
// Every request is a POST with the header `x-write-key: <the book's key>` and a JSON body:
//   { "action": "save", "recipe": { ...Recipe payload, see save_recipe in 000_initial_schema.sql } }
//   { "action": "delete", "id": "<recipe uuid>" }
//   { "action": "upload-url", "bucket": "photos" | "originals" | "handwriting", "recipeId": "<uuid>", "ext": "jpg" }
//     -> a signed URL the browser uploads one file to, and the path to save on the recipe
//   { "action": "check" }                                   -> { ok: true, book } if the write key is right
//   { "action": "cooked", "id": "<recipe uuid>" }           -> adds one to times cooked
//   { "action": "groceries-add", "items": ["2 lbs chicken"], "recipeId"?: "<uuid>" }
//   { "action": "grocery-check", "id": "<item uuid>", "checked": true }
//   { "action": "groceries-clear", "onlyChecked": true }
//   { "action": "plan-add", "day": "2026-10-30", "recipeId"?: "<uuid>", "note"?: "leftovers", "servings"?: 6 }
//   { "action": "plan-remove", "id": "<meal uuid>" }
//
// WRITE_KEY and WRITE_KEY_JAY are set with `supabase secrets set` (npm run setup:supabase and
// npm run setup:jay-key). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// provided to Edge Functions by Supabase. Deploy with --no-verify-jwt (there is no login yet;
// the write key is the check).

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const KEYS: [book: string, key: string][] = [
  ["ramiya", Deno.env.get("WRITE_KEY") ?? ""],
  ["jay", Deno.env.get("WRITE_KEY_JAY") ?? ""],
];

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const UPLOAD_TYPES: Record<string, string[]> = {
  photos: ["jpg", "jpeg", "png", "heic", "heif", "webp"],
  originals: ["jpg", "jpeg", "png", "heic", "heif", "pdf"],
  handwriting: ["png", "drawing"],
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Compare without returning early, so response timing doesn't reveal how much of a guess matched.
function sameKey(given: string, expected: string) {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  if (!KEYS[0][1]) return json({ error: "WRITE_KEY is not set on the server" }, 500);
  // Every key is compared, so the time taken doesn't reveal which one nearly matched.
  const given = req.headers.get("x-write-key") ?? "";
  let book: string | null = null;
  for (const [b, key] of KEYS) if (key && sameKey(given, key)) book = b;
  if (!book) return json({ error: "Unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body must be JSON" }, 400);
  }

  const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

  // Whether a row is in this key's book: "yes", "other" (the other book's) or "missing".
  async function inBook(table: "recipes" | "grocery_items" | "meal_plan", id: string) {
    const { data, error } = await supabase.from(table).select("book").eq("id", id).maybeSingle();
    if (error) throw error;
    return !data ? "missing" : data.book === book ? "yes" : "other";
  }
  const otherBook = () => json({ error: "That belongs to the other book." }, 403);

  switch (body.action) {
    case "check":
      return json({ ok: true, book });

    case "save": {
      if (typeof body.recipe !== "object" || body.recipe === null) {
        return json({ error: "recipe is required" }, 400);
      }
      const { data, error } = await supabase.rpc("save_recipe", { payload: { ...(body.recipe as object), book } });
      if (error) return json({ error: error.message }, 400);
      const { search: _search, ...recipe } = data;
      return json({ recipe });
    }

    case "delete": {
      if (!isUuid(body.id)) return json({ error: "id must be a recipe uuid" }, 400);
      if ((await inBook("recipes", body.id)) === "other") return otherBook();
      const { error } = await supabase.rpc("delete_recipe", { rid: body.id });
      if (error) return json({ error: error.message }, 400);
      return json({ deleted: body.id });
    }

    case "upload-url": {
      const bucket = String(body.bucket);
      const ext = String(body.ext ?? "").toLowerCase();
      if (!UPLOAD_TYPES[bucket]?.includes(ext)) {
        return json({ error: `Allowed for ${bucket}: ${UPLOAD_TYPES[bucket]?.join(", ") ?? "none"}` }, 400);
      }
      if (!isUuid(body.recipeId)) return json({ error: "recipeId must be a recipe uuid" }, 400);
      // A new recipe doesn't exist yet; an existing one must be in this book.
      if ((await inBook("recipes", body.recipeId)) === "other") return otherBook();
      const path = `${body.recipeId}/${crypto.randomUUID()}.${ext}`;
      const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
      if (error) return json({ error: error.message }, 400);
      return json({ bucket, path, uploadUrl: data.signedUrl, token: data.token });
    }

    case "cooked": {
      if (!isUuid(body.id)) return json({ error: "id must be a recipe uuid" }, 400);
      if ((await inBook("recipes", body.id)) === "other") return otherBook();
      const { data, error } = await supabase.rpc("record_cooked", { rid: body.id });
      if (error) return json({ error: error.message }, 400);
      return json({ timesCooked: data });
    }

    case "groceries-add": {
      const items = Array.isArray(body.items) ? body.items.filter((i) => typeof i === "string") : [];
      if (items.length === 0) return json({ error: "items must be a list of text" }, 400);
      if (body.recipeId != null && !isUuid(body.recipeId)) {
        return json({ error: "recipeId must be a recipe uuid" }, 400);
      }
      if (isUuid(body.recipeId) && (await inBook("recipes", body.recipeId)) === "other") return otherBook();
      const { data, error } = await supabase.rpc("add_groceries", { items, rid: body.recipeId ?? null, b: book });
      if (error) return json({ error: error.message }, 400);
      return json({ items: data });
    }

    case "grocery-check": {
      if (!isUuid(body.id)) return json({ error: "id must be a grocery item uuid" }, 400);
      if ((await inBook("grocery_items", body.id)) === "other") return otherBook();
      const { error } = await supabase.rpc("set_grocery_checked", { item_id: body.id, is_checked: body.checked === true });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    case "groceries-clear": {
      const { data, error } = await supabase.rpc("clear_groceries", { only_checked: body.onlyChecked !== false, b: book });
      if (error) return json({ error: error.message }, 400);
      return json({ removed: data });
    }

    case "plan-add": {
      if (typeof body.day !== "string" || !DAY.test(body.day)) return json({ error: "day must be YYYY-MM-DD" }, 400);
      if (body.recipeId != null && !isUuid(body.recipeId)) return json({ error: "recipeId must be a recipe uuid" }, 400);
      const note = typeof body.note === "string" ? body.note : null;
      if (body.recipeId == null && !note?.trim()) return json({ error: "a meal needs a recipe or a note" }, 400);
      if (isUuid(body.recipeId) && (await inBook("recipes", body.recipeId)) === "other") return otherBook();
      const servings = Number.isInteger(body.servings) ? body.servings : null;
      const { data, error } = await supabase.rpc("plan_add", {
        plan_day: body.day,
        rid: body.recipeId ?? null,
        plan_note: note,
        plan_servings: servings,
        b: book,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ meal: data });
    }

    case "plan-remove": {
      if (!isUuid(body.id)) return json({ error: "id must be a meal uuid" }, 400);
      if ((await inBook("meal_plan", body.id)) === "other") return otherBook();
      const { error } = await supabase.rpc("plan_remove", { item_id: body.id });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    default:
      return json({ error: "unknown action" }, 400);
  }
});
