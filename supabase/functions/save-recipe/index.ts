// save-recipe: the only way to change the recipe book. Called by the website's server.
//
// Every request is a POST with the header `x-write-key: <WRITE_KEY>` and a JSON body:
//   { "action": "save", "recipe": { ...Recipe payload, see save_recipe in 000_initial_schema.sql } }
//   { "action": "delete", "id": "<recipe uuid>" }
//   { "action": "upload-url", "bucket": "photos" | "originals" | "handwriting", "recipeId": "<uuid>", "ext": "jpg" }
//     -> a signed URL the browser uploads one file to, and the path to save on the recipe
//   { "action": "check" }                                   -> { ok: true } if the write key is right
//   { "action": "cooked", "id": "<recipe uuid>" }           -> adds one to times cooked
//   { "action": "groceries-add", "items": ["2 lbs chicken"], "recipeId"?: "<uuid>" }
//   { "action": "grocery-check", "id": "<item uuid>", "checked": true }
//   { "action": "groceries-clear", "onlyChecked": true }
//
// WRITE_KEY is set with `supabase secrets set`. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// provided to Edge Functions by Supabase. Deploy with --no-verify-jwt (there is no login yet;
// the write key is the check).

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const WRITE_KEY = Deno.env.get("WRITE_KEY") ?? "";

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
  if (!WRITE_KEY) return json({ error: "WRITE_KEY is not set on the server" }, 500);
  if (!sameKey(req.headers.get("x-write-key") ?? "", WRITE_KEY)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body must be JSON" }, 400);
  }

  const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

  switch (body.action) {
    case "check":
      return json({ ok: true });

    case "save": {
      if (typeof body.recipe !== "object" || body.recipe === null) {
        return json({ error: "recipe is required" }, 400);
      }
      const { data, error } = await supabase.rpc("save_recipe", { payload: body.recipe });
      if (error) return json({ error: error.message }, 400);
      const { search: _search, ...recipe } = data;
      return json({ recipe });
    }

    case "delete": {
      if (!isUuid(body.id)) return json({ error: "id must be a recipe uuid" }, 400);
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
      const path = `${body.recipeId}/${crypto.randomUUID()}.${ext}`;
      const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
      if (error) return json({ error: error.message }, 400);
      return json({ bucket, path, uploadUrl: data.signedUrl, token: data.token });
    }

    case "cooked": {
      if (!isUuid(body.id)) return json({ error: "id must be a recipe uuid" }, 400);
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
      const { data, error } = await supabase.rpc("add_groceries", { items, rid: body.recipeId ?? null });
      if (error) return json({ error: error.message }, 400);
      return json({ items: data });
    }

    case "grocery-check": {
      if (!isUuid(body.id)) return json({ error: "id must be a grocery item uuid" }, 400);
      const { error } = await supabase.rpc("set_grocery_checked", { item_id: body.id, is_checked: body.checked === true });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    case "groceries-clear": {
      const { data, error } = await supabase.rpc("clear_groceries", { only_checked: body.onlyChecked !== false });
      if (error) return json({ error: error.message }, 400);
      return json({ removed: data });
    }

    default:
      return json({ error: "unknown action" }, 400);
  }
});
