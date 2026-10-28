#!/usr/bin/env bash
# Checks the Supabase and Vercel setup end to end. Changes nothing except a "setup check" test
# recipe, which it saves and then deletes (only when WRITE_KEY is given).
#
#   bash scripts/check-setup.sh                                   # database + access rules
#   WRITE_KEY=<key> bash scripts/check-setup.sh                   # + the save-recipe function
#   WRITE_KEY=<key> bash scripts/check-setup.sh https://<site>.vercel.app   # + the live website

set -uo pipefail
cd "$(dirname "$0")/.."

set -a
# shellcheck disable=SC1091
. ./.env.local
set +a
URL=${NEXT_PUBLIC_SUPABASE_URL%/}
ANON=$NEXT_PUBLIC_SUPABASE_ANON_KEY
SITE=${1:-}
SITE=${SITE%/}
FAILED=0

pass() { echo "  PASS  $1"; }
fail() { echo "  FAIL  $1"; FAILED=1; }

# status <curl args...>  -> prints the HTTP status, body saved in $BODY
BODY=$(mktemp)
trap 'rm -f "$BODY"' EXIT
status() { curl -s -o "$BODY" -w '%{http_code}' "$@"; }

echo "Database ($URL)"
code=$(status "$URL/rest/v1/recipes?select=slug&slug=eq.sweet-chili-chicken" -H "apikey: $ANON")
if [ "$code" = 200 ] && grep -q sweet-chili-chicken "$BODY"; then
  pass "public key can read recipes (sweet chili chicken is there)"
else
  fail "reading recipes returned $code: $(head -c 200 "$BODY") (has the migration been run?)"
fi

code=$(status -X POST "$URL/rest/v1/rpc/keep_alive" -H "apikey: $ANON" -H "Content-Type: application/json" -d '{}')
[ "$code" = 200 ] && pass "keep_alive() works" || fail "keep_alive() returned $code"

code=$(status -X POST "$URL/rest/v1/recipes" -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"slug":"should-not-save","title":"should not save"}')
case $code in 401 | 403) pass "public key can't insert rows ($code)" ;; *) fail "insert with the public key returned $code" ;; esac

code=$(status -X POST "$URL/rest/v1/rpc/save_recipe" -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"payload":{"title":"should not save"}}')
case $code in 401 | 403 | 404) pass "public key can't call save_recipe ($code)" ;; *) fail "save_recipe with the public key returned $code" ;; esac

for bucket in photos originals handwriting; do
  # Uploading without a signed URL from save-recipe must be refused.
  up=$(status -X POST "$URL/storage/v1/object/$bucket/setup-check.png" -H "apikey: $ANON" \
    -H "Authorization: Bearer $ANON" -H "Content-Type: image/png" --data-binary 'x')
  case $up in 400 | 401 | 403) pass "public key can't upload to $bucket ($up)" ;; *) fail "upload to $bucket with the public key returned $up" ;; esac
done

echo
echo "save-recipe function"
FN="$URL/functions/v1/save-recipe"
code=$(status -X POST "$FN" -H "Content-Type: application/json" -d '{"action":"save","recipe":{"title":"x"}}')
if [ "$code" = 401 ]; then
  pass "refuses requests without the write key"
elif [ "$code" = 404 ]; then
  fail "function not found (run scripts/setup-supabase.sh)"
else
  fail "request without the write key returned $code: $(head -c 200 "$BODY")"
fi

if [ -n "${WRITE_KEY:-}" ]; then
  code=$(status -X POST "$FN" -H "x-write-key: $WRITE_KEY" -H "Content-Type: application/json" -d '{"action":"check"}')
  [ "$code" = 200 ] && pass "accepts the write key (check)" || fail "check returned $code: $(head -c 200 "$BODY") (redeploy with npm run deploy:functions?)"

  TEST_ID=00000000-0000-4000-8000-00000000c0de
  code=$(status -X POST "$FN" -H "x-write-key: $WRITE_KEY" -H "Content-Type: application/json" \
    -d "{\"action\":\"save\",\"recipe\":{\"id\":\"$TEST_ID\",\"slug\":\"setup-check\",\"title\":\"setup check\",\"ingredientGroups\":[{\"name\":\"\",\"items\":[{\"quantity\":\"1\",\"unit\":\"c\",\"item\":\"test\"}]}]}}")
  [ "$code" = 200 ] && pass "saves a recipe with the write key" || fail "save with the write key returned $code: $(head -c 200 "$BODY")"

  code=$(status -X POST "$FN" -H "x-write-key: $WRITE_KEY" -H "Content-Type: application/json" \
    -d "{\"action\":\"upload-url\",\"bucket\":\"photos\",\"recipeId\":\"$TEST_ID\",\"ext\":\"jpg\"}")
  [ "$code" = 200 ] && grep -q uploadUrl "$BODY" && pass "hands out a signed upload URL" || fail "upload-url returned $code: $(head -c 200 "$BODY")"

  code=$(status -X POST "$FN" -H "x-write-key: $WRITE_KEY" -H "Content-Type: application/json" \
    -d "{\"action\":\"delete\",\"id\":\"$TEST_ID\"}")
  [ "$code" = 200 ] && pass "deletes the test recipe" || fail "delete returned $code: $(head -c 200 "$BODY")"
else
  echo "  SKIP  save/upload/delete (set WRITE_KEY=<your key> to test them)"
fi

if [ -n "$SITE" ]; then
  echo
  echo "Website ($SITE)"
  code=$(status "$SITE/")
  if [ "$code" = 200 ] && grep -qi "sweet chili chicken" "$BODY"; then
    pass "cover lists the sweet chili chicken"
  elif [ "$code" = 200 ]; then
    fail "the page loads but isn't the recipe book (is $SITE your site's address? Vercel -> project -> Domains)"
  else
    fail "cover returned $code"
  fi
  code=$(status "$SITE/recipe/sweet-chili-chicken")
  if [ "$code" = 200 ] && grep -q "coconut lime drizzle" "$BODY"; then
    pass "recipe page loads from the database"
    code=$(status "$SITE/recipe/setup-check")
    [ "$code" = 404 ] && pass "deleted recipes are hidden" || echo "  INFO  /recipe/setup-check returned $code (pages refresh about once a minute)"
  else
    fail "recipe page returned $code"
  fi
fi

echo
if [ "$FAILED" = 0 ]; then echo "All checks passed."; else echo "Some checks failed."; fi
exit "$FAILED"
