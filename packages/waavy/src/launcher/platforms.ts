/**
 * The platforms waavy ships a prebuilt binary for through npm.
 *
 * Each entry is one optional npm package, `@bundt/waavy-<os>-<cpu>`, holding
 * only `bin/waavy` (`bin/waavy.exe` on Windows). npm and Bun install the one
 * whose `os`/`cpu` match the machine; the launcher (`launcher/resolve.ts`)
 * then finds it by name. The same table drives the cross-compile script
 * (`build/binaries.ts`) and the version-sync script, so adding a platform is
 * one edit here plus its `npm/<os>-<cpu>/package.json`.
 *
 * `os`/`cpu` use Node's `process.platform`/`process.arch` vocabulary, which
 * is also what npm's `os`/`cpu` package fields match against.
 *
 * musl (Alpine) binaries are deliberately absent: npm cannot select a
 * package by libc, so they are GitHub release assets only
 * (WAAVY_P3_DIST.md, "Locked decisions").
 */

/** How much a platform is relied on. Experimental platforms are smoke-tested only. */
export type PlatformSupport = 'supported' | 'experimental';

/** One npm-distributed platform. */
export type NpmPlatform = {
  /** `process.platform` value. */
  os: NodeJS.Platform;
  /** `process.arch` value. */
  cpu: NodeJS.Architecture;
  support: PlatformSupport;
};

export const NPM_PLATFORMS: readonly NpmPlatform[] = [
  { os: 'darwin', cpu: 'arm64', support: 'supported' },
  { os: 'darwin', cpu: 'x64', support: 'supported' },
  { os: 'linux', cpu: 'x64', support: 'supported' },
  { os: 'linux', cpu: 'arm64', support: 'supported' },
  // Experimental: TCP only (no unix sockets), smoke-tested in CI (ARCH D11).
  { os: 'win32', cpu: 'x64', support: 'experimental' }
];

/** `darwin-arm64`, `win32-x64`, …: the directory and package-name suffix. */
export function platformKey(platform: Pick<NpmPlatform, 'os' | 'cpu'>): string {
  return `${platform.os}-${platform.cpu}`;
}

/** The npm package that carries the binary for `platform`. */
export function platformPackageName(platform: Pick<NpmPlatform, 'os' | 'cpu'>): string {
  return `@bundt/waavy-${platformKey(platform)}`;
}

/** File name of the executable inside a platform package's `bin/`. */
export function binaryFileName(os: NodeJS.Platform): string {
  return os === 'win32' ? 'waavy.exe' : 'waavy';
}

/** The table entry for this OS/CPU pair, if waavy ships one. */
export function findNpmPlatform(os: string, cpu: string): NpmPlatform | undefined {
  return NPM_PLATFORMS.find((platform) => platform.os === os && platform.cpu === cpu);
}
