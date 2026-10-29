#!/usr/bin/env bun
/**
 * Syncs waavy's version across the main npm package, the platform packages,
 * and the Rust crate (see packages/waavy/build/version-sync.ts).
 *
 *   bun scripts/waavy-sync-versions.ts                    # propagate package.json's version
 *   bun scripts/waavy-sync-versions.ts --version 0.3.1    # set a new version everywhere
 *   bun scripts/waavy-sync-versions.ts --check            # exit 1 if anything drifted (CI)
 *
 * Remember to update `WAAVY_VERSION` in packages/waavy/src/core/version.ts
 * when setting a new version; its test fails until you do.
 */

import { writeFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { parseArgs } from 'node:util';

import { driftedFiles, planVersionSync } from '../packages/waavy/build/version-sync';

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    version: { type: 'string' },
    check: { type: 'boolean', default: false }
  },
  strict: true
});

if (values.check && values.version !== undefined) {
  console.error('--check verifies the current version; it cannot be combined with --version');
  process.exit(2);
}

const drifted = driftedFiles(planVersionSync(values.version));
const label = (path: string) => relative(process.cwd(), path);

if (values.check) {
  if (drifted.length > 0) {
    console.error('waavy versions are out of sync. Run `bun scripts/waavy-sync-versions.ts`. Drifted:');
    for (const file of drifted) console.error(`  ${label(file.path)}`);
    process.exit(1);
  }
  console.log('waavy versions are in sync.');
} else {
  for (const file of drifted) {
    await writeFile(file.path, file.desired, 'utf8');
    console.log(`Updated ${label(file.path)}`);
  }
  if (drifted.length === 0) console.log('Nothing to update.');
}
