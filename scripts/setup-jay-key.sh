#!/usr/bin/env bash
# Sets Jay's write key (the second book, docs/HANDOFF.md "Who's using this") and redeploys
# save-recipe. Ramiya's key (WRITE_KEY) is set by setup-supabase.sh and isn't touched.
# Run migration 004 in the SQL Editor first. Safe to run again to change Jay's key.
#
#   bash scripts/setup-jay-key.sh      (or: npm run setup:jay-key)

set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v supabase >/dev/null; then
  echo "The Supabase CLI isn't installed. Run:  brew install supabase/tap/supabase" >&2
  exit 1
fi
if ! supabase projects list >/dev/null 2>&1; then
  supabase login
fi

echo "== Jay's write key (unlocks Jay's Recipes only)"
read -rsp "Paste a key for Jay, or press Enter to generate a new one: " KEY
echo
if [ -z "$KEY" ]; then
  KEY=$(openssl rand -hex 32)
  echo "New key for Jay's Recipes (save it in your password manager now; it isn't shown again):"
  echo
  echo "    $KEY"
  echo
fi
# Pass the secret through a private temp file rather than the command line.
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
chmod 600 "$TMP"
printf 'WRITE_KEY_JAY=%s\n' "$KEY" >"$TMP"
supabase secrets set --env-file "$TMP"

echo
echo "== Deploying the save-recipe function"
supabase functions deploy save-recipe --no-verify-jwt

echo
echo "Done. Unlock it on the website: Settings → Who's using this: Jay → Unlock editing."
