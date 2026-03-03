#!/usr/bin/env bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

pass() {
  echo -e "${GREEN}✓${NC} $1"
  PASSED=$((PASSED + 1))
}

fail() {
  echo -e "${RED}✗${NC} $1"
  FAILED=$((FAILED + 1))
}

warn() {
  echo -e "${YELLOW}!${NC} $1"
}

section() {
  echo ""
  echo -e "${YELLOW}━━━ $1 ━━━${NC}"
}

# =============================================================================
section "Build Check"
# =============================================================================

if [ -d "dist" ]; then
  pass "dist/ exists"
else
  fail "dist/ missing — run 'bun run build'"
fi

for f in dist/index.bun.js dist/cli.bun.js; do
  if [ -f "$f" ]; then
    pass "$f exists"
  else
    fail "$f missing"
  fi
done

if [ -f "dist/index.d.ts" ]; then
  pass "Type declarations exist (index.d.ts)"
else
  fail "Type declarations missing (index.d.ts)"
fi

if [ -f "dist/theme/styles.css" ]; then
  pass "Theme CSS copied to dist"
else
  fail "dist/theme/styles.css missing"
fi

# =============================================================================
section "Entry Points"
# =============================================================================

if bun bin/dxdocs.ts --version &>/dev/null; then
  VERSION=$(bun bin/dxdocs.ts --version 2>&1 | head -1)
  pass "Bun entry point works ($VERSION)"
else
  fail "Bun entry point failed"
fi

# =============================================================================
section "CLI Commands"
# =============================================================================

if bun bin/dxdocs.ts --help &>/dev/null; then
  pass "Help command works"
else
  fail "Help command failed"
fi

if [ -f "bin/dxdocs.mjs" ]; then
  pass "Node shim exists (bin/dxdocs.mjs)"
else
  fail "Node shim missing (bin/dxdocs.mjs)"
fi

# =============================================================================
section "Package Metadata"
# =============================================================================

if [ -f "package.json" ]; then
  pass "package.json exists"

  NAME=$(node -p "require('./package.json').name" 2>/dev/null)
  if [ "$NAME" = "@bundt/dxdocs" ]; then
    pass "Package name is correct ($NAME)"
  else
    fail "Package name incorrect ($NAME)"
  fi

  VERSION=$(node -p "require('./package.json').version" 2>/dev/null)
  if [ -n "$VERSION" ]; then
    pass "Version is set ($VERSION)"
  else
    fail "Version not set"
  fi

  PRIVATE=$(node -p "require('./package.json').private || false" 2>/dev/null)
  if [ "$PRIVATE" = "false" ]; then
    pass "Package is not private"
  else
    fail "Package is marked private"
  fi

  BIN_COUNT=$(node -p "Object.keys(require('./package.json').bin || {}).length" 2>/dev/null)
  if [ "$BIN_COUNT" -ge 1 ]; then
    pass "Bin entries defined ($BIN_COUNT)"
  else
    fail "No bin entries"
  fi

  FILES=$(node -p "require('./package.json').files?.length || 0" 2>/dev/null)
  if [ "$FILES" -gt 0 ]; then
    pass "Files array defined ($FILES entries)"
  else
    fail "Files array missing"
  fi
else
  fail "package.json missing"
fi

# =============================================================================
section "Required Files"
# =============================================================================

for file in LICENSE README.md CHANGELOG.md; do
  if [ -f "$file" ]; then
    pass "$file exists"
  else
    fail "$file missing"
  fi
done

# =============================================================================
section "npm Pack Test"
# =============================================================================

PACK_OUTPUT=$(npm pack --dry-run 2>&1)
if [ $? -eq 0 ]; then
  pass "npm pack --dry-run succeeded"

  SIZE=$(echo "$PACK_OUTPUT" | grep "package size" | awk '{print $4, $5}')
  if [ -n "$SIZE" ]; then
    pass "Package size: $SIZE"
  fi

  FILE_COUNT=$(echo "$PACK_OUTPUT" | grep "total files" | awk '{print $3}')
  if [ -n "$FILE_COUNT" ]; then
    pass "Total files: $FILE_COUNT"
  fi
else
  fail "npm pack failed"
fi

# =============================================================================
section "Summary"
# =============================================================================

echo ""
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All checks passed! Ready for release.${NC}"
  exit 0
else
  echo -e "${RED}Some checks failed. Please fix before releasing.${NC}"
  exit 1
fi
