/**
 * Keeps every file that carries waavy's version in lockstep:
 *
 * - `packages/waavy/package.json` — `version` and `optionalDependencies`;
 * - `packages/waavy/npm/<os>-<cpu>/package.json` — the whole manifest;
 * - `crates/waavy/Cargo.toml` — the crate `version` (lockstep for 0.x,
 *   WAAVY_P3_DIST.md "Locked decisions").
 *
 * `planVersionSync` computes the desired contents without writing anything,
 * so the same code backs the sync script (`scripts/waavy-sync-versions.ts`),
 * its `--check` mode in the release workflow, and the drift test
 * (`test/platform-packages.test.ts`).
 *
 * `src/core/version.ts` (`WAAVY_VERSION`) is deliberately not rewritten
 * here: it is source code with its own test against `package.json`, so a
 * forgotten bump fails `bun test` rather than being papered over.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { NPM_PLATFORMS } from '../src/launcher/platforms';
import {
  expectedOptionalDependencies,
  expectedPlatformManifest,
  formatManifest,
  type MainManifest,
  platformManifestPath
} from './platform-packages';

/** Absolute path of `packages/waavy`. */
export const PACKAGE_ROOT = resolve(import.meta.dir, '..');

/** Absolute path of the crate manifest. */
export const CRATE_MANIFEST = resolve(PACKAGE_ROOT, '..', '..', 'crates', 'waavy', 'Cargo.toml');

/** One file and the contents it should have. */
export type SyncedFile = {
  /** Absolute path. */
  path: string;
  /** Current contents, or `undefined` when the file does not exist yet. */
  current: string | undefined;
  desired: string;
};

/**
 * Every version-carrying file with its desired contents.
 *
 * @param version - the version to set; defaults to the main package's
 *   current version (i.e. "propagate what package.json says").
 */
export function planVersionSync(version?: string): SyncedFile[] {
  const mainPath = join(PACKAGE_ROOT, 'package.json');
  const mainText = readFileSync(mainPath, 'utf8');
  const main = JSON.parse(mainText) as MainManifest & Record<string, unknown>;
  const target: MainManifest = { ...main, version: version ?? main.version };

  const desiredMain = formatManifest({
    ...main,
    version: target.version,
    optionalDependencies: expectedOptionalDependencies(target.version)
  });

  const platformFiles = NPM_PLATFORMS.map((platform): SyncedFile => {
    const path = join(PACKAGE_ROOT, platformManifestPath(platform));
    return {
      path,
      current: readIfExists(path),
      desired: formatManifest(expectedPlatformManifest(platform, target))
    };
  });

  const crateText = readFileSync(CRATE_MANIFEST, 'utf8');
  return [
    { path: mainPath, current: mainText, desired: desiredMain },
    ...platformFiles,
    { path: CRATE_MANIFEST, current: crateText, desired: withCrateVersion(crateText, target.version) }
  ];
}

/** The files whose contents differ from what they should be. */
export function driftedFiles(plan: readonly SyncedFile[]): SyncedFile[] {
  return plan.filter((file) => file.current !== file.desired);
}

/**
 * Replaces the `version` of the `[package]` table. Only the first
 * `version = "…"` line after `[package]` is touched, so dependency versions
 * are never affected.
 */
export function withCrateVersion(cargoToml: string, version: string): string {
  const packageTable = /(\[package\][^[]*?\nversion\s*=\s*")[^"]*(")/;
  if (!packageTable.test(cargoToml)) throw new Error('Cargo.toml has no [package] version line');
  return cargoToml.replace(packageTable, `$1${version}$2`);
}

function readIfExists(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, 'utf8') : undefined;
}
