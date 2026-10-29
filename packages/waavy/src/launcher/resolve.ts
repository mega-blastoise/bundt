/**
 * Finds the native `waavy` executable the npm launcher should run.
 *
 * Resolution order (first match wins):
 *
 * 1. `WAAVY_BINARY_PATH` — an explicit override, for custom builds, musl
 *    systems (whose binaries come from GitHub releases), and development.
 * 2. The platform package for this machine,
 *    `@bundt/waavy-<os>-<cpu>/bin/waavy[.exe]`, resolved from the launcher's
 *    own location so it works with npm, pnpm, Bun, and hoisted or isolated
 *    installs alike.
 * 3. Otherwise an actionable error.
 *
 * Everything the function touches is injected, so it is tested without a
 * real installation.
 */

import { binaryFileName, findNpmPlatform, NPM_PLATFORMS, platformKey, platformPackageName } from './platforms';

/** Environment variable that overrides binary resolution. */
export const BINARY_PATH_ENV = 'WAAVY_BINARY_PATH';

/** What `resolveBinary` needs from its surroundings. */
export type ResolveContext = {
  env: Readonly<Record<string, string | undefined>>;
  /** `process.platform`. */
  os: string;
  /** `process.arch`. */
  cpu: string;
  /** Module resolution (`require.resolve`), throwing when not found. */
  resolveModule: (specifier: string) => string;
  /** Whether a file exists. */
  fileExists: (path: string) => boolean;
};

/** Raised when no binary can be found; the message is shown to the user as is. */
export class BinaryNotFoundError extends Error {
  override readonly name = 'BinaryNotFoundError';
}

/** The absolute path of the executable to run. */
export function resolveBinary(context: ResolveContext): string {
  const override = context.env[BINARY_PATH_ENV];
  if (override !== undefined && override !== '') {
    if (!context.fileExists(override)) {
      throw new BinaryNotFoundError(`${BINARY_PATH_ENV} is set to "${override}", but no file exists there.`);
    }
    return override;
  }

  const platform = findNpmPlatform(context.os, context.cpu);
  if (platform === undefined) throw new BinaryNotFoundError(unsupportedPlatformMessage(context));

  const packageName = platformPackageName(platform);
  try {
    return context.resolveModule(`${packageName}/bin/${binaryFileName(platform.os)}`);
  } catch {
    throw new BinaryNotFoundError(missingPackageMessage(packageName));
  }
}

function supportedList(): string {
  return NPM_PLATFORMS.map(
    (platform) => `  - ${platformKey(platform)}${platform.support === 'experimental' ? ' (experimental)' : ''}`
  ).join('\n');
}

function unsupportedPlatformMessage(context: ResolveContext): string {
  return [
    `waavy has no prebuilt binary for ${context.os}-${context.cpu} on npm. Supported platforms:`,
    supportedList(),
    '',
    'Linux musl (Alpine) binaries are available from the GitHub release:',
    '  https://github.com/mega-blastoise/bundt/releases',
    `Download one and point ${BINARY_PATH_ENV} at it.`
  ].join('\n');
}

function missingPackageMessage(packageName: string): string {
  return [
    `The waavy binary package ${packageName} is not installed.`,
    '',
    'It is an optional dependency of @bundt/waavy, so it is skipped when optional',
    'dependencies are disabled (npm --omit=optional / --no-optional, yarn',
    '--ignore-optional, or a lockfile created on another platform).',
    `Reinstall with optional dependencies, add ${packageName} explicitly,`,
    `or set ${BINARY_PATH_ENV} to a waavy executable.`,
    '',
    'Supported platforms:',
    supportedList()
  ].join('\n');
}
