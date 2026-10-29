/**
 * P3 T4 acceptance: the published `@bundt/waavy` tarball holds the library
 * bundles, declarations, launcher and docs — and never a native binary
 * (those live in the platform packages; `dist/bin` and
 * `dist/release-assets` are local build outputs).
 */

import { describe, expect, test } from 'bun:test';

import { assertPackageBuilt, PACKAGE_ROOT } from './support/fixture';

type PackEntry = { path: string; size: number };

/** Upper bound for the tarball's unpacked size; a binary would be ~60 MB. */
const MAX_UNPACKED_BYTES = 2_000_000;

describe('npm package contents', () => {
  test('ships the launcher, bundles and docs, and no binaries', async () => {
    assertPackageBuilt();
    const child = Bun.spawn(['npm', 'pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: PACKAGE_ROOT,
      stdout: 'pipe',
      stderr: 'ignore'
    });
    const [exitCode, stdout] = await Promise.all([child.exited, new Response(child.stdout).text()]);
    expect(exitCode).toBe(0);

    const [pack] = JSON.parse(stdout) as Array<{ files: PackEntry[]; unpackedSize: number }>;
    const paths = pack?.files.map((file) => file.path) ?? [];

    for (const required of [
      'bin/waavy.js',
      'dist/launcher.js',
      'dist/cli.js',
      'dist/index.js',
      'dist/index.d.ts',
      'dist/server.js',
      'dist/browser.js',
      'dist/entry-server.js',
      'dist/protocol.schema.json',
      'README.md',
      'CHANGELOG.md',
      'LICENSE'
    ]) {
      expect(paths).toContain(required);
    }
    expect(paths.filter((path) => /^(dist\/bin|dist\/release-assets|npm|src|test|fixtures)\//.test(path))).toEqual([]);
    expect(pack?.unpackedSize ?? Infinity).toBeLessThan(MAX_UNPACKED_BYTES);
  });
});
