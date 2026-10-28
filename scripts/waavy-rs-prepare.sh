#!/usr/bin/env bash
# Prepares everything crates/waavy's integration tests and the axum example
# need: builds @bundt/waavy, compiles the waavy binary for this platform, and
# builds the fixture release. Prints the environment variables to export.
#
#   eval "$(scripts/waavy-rs-prepare.sh)"   # then: cargo test -p waavy
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKG="$ROOT/packages/waavy"
RELEASE="$PKG/fixtures/basic/dist/waavy"

{
  (cd "$PKG" && bun run build && bun run build:binary)
  "$PKG/dist/bin/waavy" build --root "$PKG/fixtures/basic" --out "$RELEASE"
} >&2

echo "export WAAVY_BIN=\"$PKG/dist/bin/waavy\""
echo "export WAAVY_RELEASE=\"$RELEASE\""
echo "export WAAVY_PROTOCOL_SCHEMA=\"$PKG/dist/protocol.schema.json\""
