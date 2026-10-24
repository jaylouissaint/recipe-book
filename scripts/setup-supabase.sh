#!/usr/bin/env bash
# One-time Supabase setup: link this folder to the project, set the write key, deploy save-recipe.
# Run the migration in the SQL Editor first (supabase/migrations/000_initial_schema.sql).
# Safe to run again, e.g. after changing the function or to change the write key.
#
#   bash scripts/setup-supabase.sh

set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v supabase >/dev/null; then
  echo "The Supabase CLI isn't installed. Run:  brew install supabase/tap/supabase" >&2
  exit 1
fi

if [ ! -f .env.local ]; then
  echo "Missing .env.local (copy .env.example and fill it in)." >&2
  exit 1
fi
URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-)
REF=$(printf '%s' "$URL" | sed -E 's#^https://([a-z0-9]+)\.supabase\.co/?$#\1#')
if [ -z "$REF" ] || [ "$REF" = "$URL" ]; then
  echo "NEXT_PUBLIC_SUPABASE_URL in .env.local should look like https://<ref>.supabase.co" >&2
  exit 1
fi

echo "== Project: $REF"
if ! supabase projects list >/dev/null 2>&1; then
  supabase login
fi
supabase link --project-ref "$REF"

echo
echo "== Write key (what the iPad app sends to save recipes)"
read -rsp "Paste your write key, or press Enter to generate a new one: " KEY
echo
if [ -z "$KEY" ]; then
  KEY=$(openssl rand -hex 32)
  echo "New write key (save it in your password manager now; it isn't shown again):"
  echo
  echo "    $KEY"
  echo
fi
# Pass the secret through a private temp file rather than the command line.
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
chmod 600 "$TMP"
printf 'WRITE_KEY=%s\n' "$KEY" >"$TMP"
supabase secrets set --env-file "$TMP"

echo
echo "== Deploying the save-recipe function"
supabase functions deploy save-recipe --no-verify-jwt

echo
echo "Done. Check everything with:  WRITE_KEY=<your key> bash scripts/check-setup.sh"
