#!/usr/bin/env bash

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

usage() {
  echo "Usage: $0 <patch|minor|major|prepatch|preminor|premajor|prerelease> [--preid alpha|beta|rc]"
  echo ""
  echo "Examples:"
  echo "  $0 patch                      # 0.1.0-alpha.1 -> 0.1.1"
  echo "  $0 minor                      # 0.1.0 -> 0.2.0"
  echo "  $0 major                      # 0.1.0 -> 1.0.0"
  echo "  $0 prerelease --preid alpha   # 0.1.0-alpha.1 -> 0.1.0-alpha.2"
  echo "  $0 premajor --preid rc        # 0.1.0 -> 1.0.0-rc.0"
  exit 1
}

if [ -z "$1" ]; then
  usage
fi

BUMP_TYPE="$1"
PREID=""

case "$BUMP_TYPE" in
  patch|minor|major|prepatch|preminor|premajor|prerelease) ;;
  *) echo -e "${RED}Invalid bump type: $BUMP_TYPE${NC}"; usage ;;
esac

shift
while [ $# -gt 0 ]; do
  case "$1" in
    --preid)
      PREID="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      usage
      ;;
  esac
done

if [[ "$BUMP_TYPE" == pre* && -z "$PREID" ]]; then
  echo -e "${RED}Pre-release bumps require --preid (alpha, beta, or rc)${NC}"
  usage
fi

CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "Current version: ${YELLOW}${CURRENT_VERSION}${NC}"

# Compute new version
if [ -n "$PREID" ]; then
  NEW_VERSION=$(node -e "
    const v = '$CURRENT_VERSION';
    const [core, pre] = v.split('-');
    const [major, minor, patch] = core.split('.').map(Number);
    const preid = '$PREID';
    const bump = '$BUMP_TYPE';

    if (bump === 'prerelease') {
      if (pre && pre.startsWith(preid + '.')) {
        const num = parseInt(pre.split('.')[1]) + 1;
        console.log(core + '-' + preid + '.' + num);
      } else {
        console.log(core + '-' + preid + '.0');
      }
    } else if (bump === 'premajor') {
      console.log((major + 1) + '.0.0-' + preid + '.0');
    } else if (bump === 'preminor') {
      console.log(major + '.' + (minor + 1) + '.0-' + preid + '.0');
    } else if (bump === 'prepatch') {
      console.log(major + '.' + minor + '.' + (patch + 1) + '-' + preid + '.0');
    }
  ")
else
  NEW_VERSION=$(node -e "
    const v = '$CURRENT_VERSION';
    const core = v.split('-')[0];
    const [major, minor, patch] = core.split('.').map(Number);
    const bump = '$BUMP_TYPE';

    if (bump === 'major') console.log((major + 1) + '.0.0');
    else if (bump === 'minor') console.log(major + '.' + (minor + 1) + '.0');
    else if (bump === 'patch') console.log(major + '.' + minor + '.' + (patch + 1));
  ")
fi

echo -e "New version:     ${GREEN}${NEW_VERSION}${NC}"
echo ""
read -p "Proceed? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

# Update package.json version
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '$NEW_VERSION';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Update version in cli.ts
if [ -f "src/cli.ts" ]; then
  sed -i "s/cli\.version('[^']*')/cli.version('${NEW_VERSION}')/" src/cli.ts
  sed -i "s/v[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*[-a-zA-Z.0-9]*/v${NEW_VERSION}/g" src/cli.ts
fi

# Update version in builder.ts
if [ -f "src/build/builder.ts" ]; then
  sed -i "s/v[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*[-a-zA-Z.0-9]*/v${NEW_VERSION}/g" src/build/builder.ts
fi

# Add CHANGELOG entry
DATE=$(date +%Y-%m-%d)
CHANGELOG_ENTRY="## [${NEW_VERSION}] - ${DATE}"

if [ -f "CHANGELOG.md" ]; then
  # Insert new entry after the header lines
  sed -i "/^## \[/i\\
${CHANGELOG_ENTRY}\\
\\
### Changed\\
\\
- Version bump to ${NEW_VERSION}\\
" CHANGELOG.md
  echo -e "${YELLOW}Updated CHANGELOG.md — edit the entry before committing${NC}"
else
  echo -e "${YELLOW}No CHANGELOG.md found, skipping${NC}"
fi

echo ""
echo -e "${GREEN}Bumped to ${NEW_VERSION}${NC}"
echo -e "Files modified:"
echo -e "  - package.json"
[ -f "src/cli.ts" ] && echo -e "  - src/cli.ts"
[ -f "src/build/builder.ts" ] && echo -e "  - src/build/builder.ts"
[ -f "CHANGELOG.md" ] && echo -e "  - CHANGELOG.md"
echo ""
echo -e "Next steps:"
echo -e "  1. Edit CHANGELOG.md with actual changes"
echo -e "  2. git add -A && git commit -m \"chore: bump version to ${NEW_VERSION}\""
echo -e "  3. bun run release (or release:alpha, release:beta, release:rc)"
