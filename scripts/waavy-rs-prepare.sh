#!/usr/bin/env bash
# Prepares everything crates/waavy's integration tests and the axum example
# need: builds @bundt/waavy, compiles the waavy binary for this platform, and
# builds the fixture release. Prints the environment variables to set.
#
#   eval "$(scripts/waavy-rs-prepare.sh)"                     # local shell
#   scripts/waavy-rs-prepare.sh --env-file >> "$GITHUB_ENV"   # CI (KEY=value lines)
#
# Build output goes to stderr so stdout stays machine-readable.
set -euo pipefail

FORMAT="${1:-shell}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKG="$ROOT/packages/waavy"
RELEASE="$PKG/fixtures/basic/dist/waavy"

{
  (cd "$PKG" && bun run build && bun run build:binary)
  "$PKG/dist/bin/waavy" build --root "$PKG/fixtures/basic" --out "$RELEASE"
} >&2

emit() {
  if [ "$FORMAT" = "--env-file" ]; then
    echo "$1=$2"
  else
    echo "export $1=\"$2\""
  fi
}

emit WAAVY_BIN "$PKG/dist/bin/waavy"
emit WAAVY_RELEASE "$RELEASE"
emit WAAVY_PROTOCOL_SCHEMA "$PKG/dist/protocol.schema.json"
