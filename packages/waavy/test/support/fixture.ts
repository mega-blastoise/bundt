/**
 * Test support: building the `fixtures/basic` project into an isolated
 * release directory.
 *
 * The fixture's generated entries import `@bundt/waavy/entry-server` and
 * `@bundt/waavy/browser`, which resolve to this package's `dist/`. Integration
 * tests therefore require `bun run build` first (turbo's `test` task already
 * depends on `build`).
 */

import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { buildRelease, type BuiltRelease } from '../../src/build/build-release';

/** Absolute path of `packages/waavy`. */
export const PACKAGE_ROOT = resolve(import.meta.dir, '..', '..');

/** Absolute path of the fixture project. */
export const FIXTURE_ROOT = join(PACKAGE_ROOT, 'fixtures', 'basic');

/** Built CLI bundle, compiled binary, and npm launcher locations. */
export const CLI_LAUNCHER = join(PACKAGE_ROOT, 'bin', 'waavy.js');
export const CLI_BUNDLE = join(PACKAGE_ROOT, 'dist', 'cli.js');
export const CLI_BINARY = join(PACKAGE_ROOT, 'dist', 'bin', process.platform === 'win32' ? 'waavy.exe' : 'waavy');

/** Fails fast with an actionable message when `dist/` is missing. */
export function assertPackageBuilt(): void {
  for (const file of ['entry-server.js', 'browser.js', 'cli.js', 'launcher.js']) {
    if (!existsSync(join(PACKAGE_ROOT, 'dist', file))) {
      throw new Error(`dist/${file} is missing. Run \`bun run build\` in packages/waavy before integration tests.`);
    }
  }
}

/** A fixture release in its own temporary directory. */
export type FixtureRelease = BuiltRelease & {
  /** Removes the temporary directory. */
  dispose: () => Promise<void>;
};

/** Builds the fixture into a fresh temporary directory. */
export async function buildFixtureRelease(options: { production?: boolean } = {}): Promise<FixtureRelease> {
  assertPackageBuilt();
  const tempDir = await mkdtemp(join(tmpdir(), 'waavy-fixture-'));
  const built = await buildRelease({
    root: FIXTURE_ROOT,
    outDir: join(tempDir, 'release'),
    production: options.production ?? true
  });
  return { ...built, dispose: () => rm(tempDir, { recursive: true, force: true }) };
}
