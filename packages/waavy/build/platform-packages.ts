/**
 * The per-platform npm packages (`@bundt/waavy-<os>-<cpu>`) and their tie
 * to the main package (P3 T2).
 *
 * Each platform package is a committed `npm/<os>-<cpu>/package.json` plus a
 * gitignored `bin/` filled by `build/binaries.ts`. They are not workspaces:
 * they are never imported, only installed from npm by the main package's
 * `optionalDependencies`, of which npm/Bun pick the one matching `os`/`cpu`.
 *
 * Their manifests are *derived* from `NPM_PLATFORMS` and the main package,
 * never edited by hand: `scripts/waavy-sync-versions.ts` writes them, and
 * `test/platform-packages.test.ts` fails when the committed files drift.
 * Versions are always identical — the launcher assumes the binary it finds
 * matches the JavaScript package it was installed with.
 */

import { join } from 'node:path';

import { NPM_PLATFORMS, type NpmPlatform, platformKey, platformPackageName } from '../src/launcher/platforms';
import { platformPackageDir } from './targets';

/** The fields of the main `@bundt/waavy` manifest the platform packages copy. */
export type MainManifest = {
  version: string;
  license: string;
  repository: { type: string; url: string; directory?: string };
  homepage?: string;
  optionalDependencies?: Record<string, string>;
};

/** A platform package manifest, in the key order it is written. */
export type PlatformManifest = {
  name: string;
  version: string;
  description: string;
  license: string;
  repository: { type: string; url: string; directory: string };
  homepage: string | undefined;
  os: string[];
  cpu: string[];
  files: string[];
  preferUnplugged: true;
  publishConfig: { access: 'public' };
};

/** The manifest `platform`'s package must have for main package `main`. */
export function expectedPlatformManifest(platform: NpmPlatform, main: MainManifest): PlatformManifest {
  const experimental = platform.support === 'experimental' ? ' (experimental)' : '';
  return {
    name: platformPackageName(platform),
    version: main.version,
    description: `The waavy binary for ${platformKey(platform)}${experimental}. Installed automatically by @bundt/waavy.`,
    license: main.license,
    repository: {
      type: main.repository.type,
      url: main.repository.url,
      directory: join('packages', 'waavy', platformPackageDir(platform))
    },
    homepage: main.homepage,
    os: [platform.os],
    cpu: [platform.cpu],
    files: ['bin/'],
    // Yarn PnP and similar must extract the package to disk: an executable
    // cannot run from inside a zip archive.
    preferUnplugged: true,
    publishConfig: { access: 'public' }
  };
}

/**
 * The main package's `optionalDependencies`: every platform package, pinned
 * to exactly the main version (no range, so the binary and JS never differ).
 */
export function expectedOptionalDependencies(version: string): Record<string, string> {
  return Object.fromEntries(NPM_PLATFORMS.map((platform) => [platformPackageName(platform), version]));
}

/** Path of a platform package's manifest, relative to `packages/waavy`. */
export function platformManifestPath(platform: NpmPlatform): string {
  return join(platformPackageDir(platform), 'package.json');
}

/** JSON text exactly as committed (2-space indent, trailing newline). */
export function formatManifest(manifest: object): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
