/**
 * Every binary waavy builds for distribution, and where each one goes.
 *
 * - **npm targets** are one-to-one with `NPM_PLATFORMS`; their binaries are
 *   written into the committed platform package directories
 *   (`npm/<os>-<cpu>/bin/`, gitignored contents) and published to npm.
 * - **Release-asset targets** (musl) exist only as GitHub release
 *   downloads and are written to `dist/release-assets/`.
 *
 * Every target's binary is also archived as a GitHub release asset named
 * `waavy-<asset>.tar.gz` (`.zip` on Windows).
 */

import { join } from 'node:path';

import { binaryFileName, NPM_PLATFORMS, type NpmPlatform, platformKey } from '../src/launcher/platforms';

/** One `bun build --compile` target. */
export type BinaryTarget = {
  /** Bun's `--target` value. */
  bunTarget: string;
  /** Name used for the release asset, e.g. `linux-x64-musl`. */
  asset: string;
  /** Executable file name (`waavy` or `waavy.exe`). */
  fileName: string;
  /** Directory the executable is written to, relative to `packages/waavy`. */
  outDir: string;
  /** The npm platform it is published as, or `undefined` for release-asset-only targets. */
  npm: NpmPlatform | undefined;
};

/**
 * Bun target names per npm platform.
 *
 * `linux-x64` uses the `baseline` build, which does not require AVX2, so the
 * binary runs on older x64 servers and in emulators. Its cost (a few percent
 * of raw JS speed) is irrelevant next to rendering.
 */
const BUN_TARGET_BY_PLATFORM: Readonly<Record<string, string>> = {
  'darwin-arm64': 'bun-darwin-arm64',
  'darwin-x64': 'bun-darwin-x64',
  'linux-x64': 'bun-linux-x64-baseline',
  'linux-arm64': 'bun-linux-arm64',
  'win32-x64': 'bun-windows-x64'
};

/** Directory, relative to `packages/waavy`, of a platform package. */
export function platformPackageDir(platform: NpmPlatform): string {
  return join('npm', platformKey(platform));
}

const NPM_TARGETS: readonly BinaryTarget[] = NPM_PLATFORMS.map((platform) => {
  const key = platformKey(platform);
  const bunTarget = BUN_TARGET_BY_PLATFORM[key];
  if (bunTarget === undefined) throw new Error(`No Bun target is mapped for npm platform ${key}`);
  return {
    bunTarget,
    asset: key,
    fileName: binaryFileName(platform.os),
    outDir: join(platformPackageDir(platform), 'bin'),
    npm: platform
  };
});

const RELEASE_ASSET_TARGETS: readonly BinaryTarget[] = (['x64', 'arm64'] as const).map((cpu) => ({
  bunTarget: `bun-linux-${cpu}-musl`,
  asset: `linux-${cpu}-musl`,
  fileName: 'waavy',
  outDir: join('dist', 'release-assets', `linux-${cpu}-musl`),
  npm: undefined
}));

export const BINARY_TARGETS: readonly BinaryTarget[] = [...NPM_TARGETS, ...RELEASE_ASSET_TARGETS];

/** The npm target for the machine running the build, if waavy ships one. */
export function hostTarget(): BinaryTarget | undefined {
  return NPM_TARGETS.find((target) => target.npm?.os === process.platform && target.npm.cpu === process.arch);
}
