#!/usr/bin/env bash
# Install test for @bundt/waavy (P3 T5): proves the packed packages work
# for a real user on this machine, outside the monorepo.
#
#   scripts/waavy-install-test.sh               # build, pack, test
#   scripts/waavy-install-test.sh --skip-build  # reuse dist/ and npm/<host>/bin
#   scripts/waavy-install-test.sh --keep        # keep the temp dir for inspection
#
# 1. Packs the main package and this machine's platform package.
# 2. npm:  a fresh project installs react, react-dom and both tarballs, then
#          `npx waavy build` + `npx waavy render` (the launcher under Node).
# 3. Bun:  the same with `bun add` and `bunx --bun` (the launcher under Bun).
# 4. Bare: runs the binary extracted from the platform tarball with an empty
#          environment and no PATH — `render` and `serve` need neither Node
#          nor Bun on the host.
#
# Requires node/npm, bun, curl and tar. Exits non-zero on the first failure.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKG="$ROOT/packages/waavy"
FIXTURE="$PKG/fixtures/basic"

SKIP_BUILD=false
KEEP=false
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=true ;;
    --keep) KEEP=true ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

PLATFORM="$(node -p 'process.platform + "-" + process.arch')"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/waavy-install-test.XXXXXX")"
if [ "$KEEP" = true ]; then
  echo "keeping $WORK" >&2
else
  trap 'rm -rf "$WORK"' EXIT
fi

log() { printf '\n==> %s\n' "$*" >&2; }
fail() { echo "FAIL: $*" >&2; exit 1; }

# The rendered counter page must be a full document with the props applied.
assert_counter_html() {
  local file="$1"
  grep -q '<!doctype html>' "$file" || fail "$file is not an HTML document"
  grep -q 'id="waavy-root"' "$file" || fail "$file has no #waavy-root"
  grep -q 'Installed' "$file" || fail "$file is missing the label prop"
  grep -q '<span id="count">3</span>' "$file" || fail "$file is missing the initial prop"
}

# A user project: the fixture's config and pages, no workspace links.
make_project() {
  local dir="$1"
  mkdir -p "$dir"
  cp -R "$FIXTURE/pages" "$FIXTURE/waavy.config.ts" "$dir/"
  printf '{ "name": "waavy-install-test", "private": true, "type": "module" }\n' > "$dir/package.json"
}

PROPS='{"label":"Installed","initial":3}'

# --- 1. pack -----------------------------------------------------------------
if [ "$SKIP_BUILD" = false ]; then
  log "building @bundt/waavy and the $PLATFORM binary"
  (cd "$PKG" && bun run build && bun build/binaries.ts --host-only) >&2
fi
[ -x "$PKG/npm/$PLATFORM/bin/waavy" ] || fail "npm/$PLATFORM/bin/waavy is missing (run without --skip-build)"

log "packing"
mkdir -p "$WORK/tarballs"
MAIN_TGZ="$WORK/tarballs/$(cd "$PKG" && npm pack --silent --pack-destination "$WORK/tarballs")"
PLATFORM_TGZ="$WORK/tarballs/$(cd "$PKG/npm/$PLATFORM" && npm pack --silent --pack-destination "$WORK/tarballs")"
ls -l "$WORK/tarballs" >&2

# --- 2. npm --------------------------------------------------------------------
log "npm install"
NPM_PROJECT="$WORK/npm-project"
make_project "$NPM_PROJECT"
(
  cd "$NPM_PROJECT"
  npm install --no-audit --no-fund --loglevel=error react@^19 react-dom@^19 "$MAIN_TGZ" "$PLATFORM_TGZ"
  npx --no-install waavy --version
  npx --no-install waavy build
  npx --no-install waavy render --release dist/waavy --page counter --props "$PROPS" --title Installed > page.html
) >&2
assert_counter_html "$NPM_PROJECT/page.html"
echo "npm: ok" >&2

# --- 3. bun --------------------------------------------------------------------
log "bun add"
BUN_PROJECT="$WORK/bun-project"
make_project "$BUN_PROJECT"
(
  cd "$BUN_PROJECT"
  bun add react@^19 react-dom@^19 "$MAIN_TGZ" "$PLATFORM_TGZ"
  bunx --bun waavy build
  bunx --bun waavy render --release dist/waavy --page counter --props "$PROPS" > page.html
) >&2
assert_counter_html "$BUN_PROJECT/page.html"
echo "bun: ok" >&2

# --- 4. bare binary --------------------------------------------------------------
log "bare binary (no Node, no Bun, no PATH)"
mkdir -p "$WORK/bare"
tar -xzf "$PLATFORM_TGZ" -C "$WORK/bare"
BIN="$WORK/bare/package/bin/waavy"
RELEASE="$NPM_PROJECT/dist/waavy"

env -i "$BIN" render --release "$RELEASE" --page counter --props "$PROPS" > "$WORK/bare/page.html"
assert_counter_html "$WORK/bare/page.html"

SOCKET="$WORK/bare/waavy.sock"
env -i "$BIN" serve --release "$RELEASE" --socket "$SOCKET" 2> "$WORK/bare/serve.log" &
SERVE_PID=$!
for _ in $(seq 1 100); do [ -S "$SOCKET" ] && break; sleep 0.1; done
[ -S "$SOCKET" ] || { cat "$WORK/bare/serve.log" >&2; fail "serve did not create $SOCKET"; }
curl -fsS --unix-socket "$SOCKET" -X POST http://localhost/render \
  -H 'content-type: application/json' \
  -d "{\"v\":1,\"page\":\"counter\",\"props\":$PROPS}" > "$WORK/bare/served.html"
assert_counter_html "$WORK/bare/served.html"
kill -TERM "$SERVE_PID"
wait "$SERVE_PID" || fail "serve did not exit 0 after SIGTERM"
echo "bare: ok" >&2

log "install test passed on $PLATFORM"
