#!/usr/bin/env bash
# Run before every push. Exits non-zero if anything sensitive is staged or tracked.
#
#   bash scripts/pre-push-check.sh
#
# Install as a real git hook so you can't forget:
#   cp scripts/pre-push-check.sh .git/hooks/pre-push && chmod +x .git/hooks/pre-push

set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

FAIL=0
pass() { printf '  \033[32mOK\033[0m    %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; FAIL=1; }

echo
echo "Pre-push check — $(git rev-parse --short HEAD)"
echo "───────────────────────────────────────────────"

# ---------------------------------------------- files that must never be tracked
echo
echo "Tracked files"
check_path() {
  local label="$1" pattern="$2"
  local hits
  hits=$(git ls-files | grep -E "$pattern" || true)
  if [ -z "$hits" ]; then pass "$label"; else fail "$label"; echo "$hits" | sed 's/^/          /'; fi
}

check_path "no .env files"          '(^|/)\.env$|(^|/)\.env\.(local|production)'
check_path "no .dev.vars"           '\.dev\.vars'
check_path "no private/ docs"       '^private/'
check_path "no spreadsheets"        '\.xlsx?$'
check_path "no CSV exports"         '\.csv$'
check_path "no generated import SQL" '^build/'
check_path "no local database"      '\.wrangler|\.sqlite|\.db$'
check_path "no node_modules"        'node_modules'
check_path "no superseded backend"  '^dsa-backend/'

# ------------------------------------------------------- secrets inside content
echo
echo "File contents"

# This script necessarily contains the very patterns it searches for, so it would
# always flag itself. Exclude its own file by path rather than by name, so the
# exclusion survives being renamed or installed as .git/hooks/pre-push.
SELF=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")
SELF_REL=${SELF#"$(git rev-parse --show-toplevel)/"}

scan() {
  local label="$1" pattern="$2" allow="${3:-__nope__}"
  local files hits
  files=$(git ls-files | grep -vxF "$SELF_REL" || true)
  [ -z "$files" ] && { pass "$label"; return; }
  hits=$(git grep -InE "$pattern" -- $files 2>/dev/null | grep -vE "$allow" | head -5 || true)
  if [ -z "$hits" ]; then pass "$label"; else fail "$label"; echo "$hits" | sed 's/^/          /'; fi
}

# Patterns are split so this file does not match itself even if SELF_REL fails.
scan "no Resend API keys"      're_[A-Za-z0-9]{16,}'    'xxxx|\.example'
scan "no Twilio account SIDs"  'AC[a-f0-9]{32}'         'ACxxx|\.example'
scan "no Twilio auth tokens"   'SK[a-f0-9]{32}'         'SKxxx|\.example'
scan "no personal email"       'bvl''5412|@psu\.edu'    '__nope__'
scan "no personal accounts"    'Iron''lotus6|@proton\.me' '__nope__'
scan "no member phone numbers" '\+1[0-9]{10}'           '17372324091|555|example'

# --------------------------------------------------------------- commit identity
echo
echo "Commit identity"
AUTHORS=$(git log --format='%an <%ae>' | sort -u)
if echo "$AUTHORS" | grep -qiE "psu\.edu|proton\.me"; then
  fail "commit authors expose a personal address"
  echo "$AUTHORS" | sed 's/^/          /'
  echo "          fix: see docs/DEPLOY-AND-DEMO.md, 'Rewriting author history'"
else
  pass "commit authors are clean"
  echo "$AUTHORS" | sed 's/^/          /'
fi

echo
echo "───────────────────────────────────────────────"
if [ "$FAIL" -eq 0 ]; then
  echo "  Safe to push."
  echo
  exit 0
else
  echo "  DO NOT PUSH. Fix the failures above."
  echo
  echo "  If a secret was already committed, removing it in a new commit is NOT enough —"
  echo "  it stays in history. Rotate the key immediately, then rewrite history."
  echo
  exit 1
fi
