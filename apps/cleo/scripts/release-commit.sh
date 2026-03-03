#!/usr/bin/env bash
set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

git add -A
git commit -m "release(v${VERSION}): release version ${VERSION}"
