#!/usr/bin/env bash
set -e

TAG=$1

if [ -z "$TAG" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

git tag -a "v${TAG}" -m "release: v${TAG}"

COMMIT_HASH=$(git rev-parse HEAD)
echo "Tagged v${TAG} at ${COMMIT_HASH}"
