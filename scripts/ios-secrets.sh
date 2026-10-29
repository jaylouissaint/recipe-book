#!/usr/bin/env bash
# Writes ios/Secrets.xcconfig (git-ignored) from .env.local: the Supabase address and the public,
# read-only key. The write key is never put in the app.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env.local ] || { echo "No .env.local here. See docs/HANDOFF.md." >&2; exit 1; }
value() { grep -E "^$1=" .env.local | head -1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//'; }
url=$(value NEXT_PUBLIC_SUPABASE_URL)
key=$(value NEXT_PUBLIC_SUPABASE_ANON_KEY)
[ -n "$url" ] && [ -n "$key" ] || { echo "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing from .env.local." >&2; exit 1; }
# xcconfig files read "//" as a comment, so only the host goes in; the app adds https://.
host=${url#https://}
host=${host%%/*}
cat > ios/Secrets.xcconfig <<CONF
// Made by scripts/ios-secrets.sh from .env.local. Not committed.
SUPABASE_HOST = $host
SUPABASE_ANON_KEY = $key
CONF
echo "Wrote ios/Secrets.xcconfig"
