/**
 * P3 T2 acceptance: the platform packages, the main package's
 * `optionalDependencies`, and the crate version never drift apart, and the
 * platform manifests select exactly one machine each.
 */

import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, test } from 'bun:test';

import { BINARY_TARGETS } from '../build/targets';
import { CRATE_MANIFEST, driftedFiles, PACKAGE_ROOT, planVersionSync, withCrateVersion } from '../build/version-sync';
import { NPM_PLATFORMS, platformKey, platformPackageName } from '../src/launcher/platforms';

describe('version sync', () => {
  test('every committed version-carrying file is in sync (run scripts/waavy-sync-versions.ts)', () => {
    const drifted = driftedFiles(planVersionSync()).map((file) => relative(PACKAGE_ROOT, file.path));
    expect(drifted).toEqual([]);
  });

  test('setting a new version rewrites every file, and only the version fields', () => {
    const plan = planVersionSync('9.9.9-rc.1');
    for (const file of plan) {
      expect(file.desired).toContain('9.9.9-rc.1');
      // Only version strings differ from the in-sync contents.
      expect(file.desired.replaceAll('9.9.9-rc.1', 'X')).toBe((file.current ?? '').replaceAll(currentVersion(), 'X'));
    }
  });

  test('the crate version replacement leaves dependency versions alone', () => {
    const toml = '[package]\nname = "waavy"\nversion = "0.1.0"\n\n[dependencies]\nfoo = { version = "0.1.0" }\n';
    expect(withCrateVersion(toml, '0.3.0')).toBe(toml.replace('version = "0.1.0"\n\n', 'version = "0.3.0"\n\n'));
  });
});

describe('platform manifests', () => {
  test('each platform package targets exactly its own os/cpu and ships only bin/', () => {
    for (const platform of NPM_PLATFORMS) {
      const manifest = readJson(join('npm', platformKey(platform), 'package.json'));
      expect(manifest).toMatchObject({
        name: platformPackageName(platform),
        os: [platform.os],
        cpu: [platform.cpu],
        files: ['bin/'],
        publishConfig: { access: 'public' }
      });
    }
  });

  test('the main package depends on every platform package at its exact version', () => {
    const main = readJson('package.json') as { version: string; optionalDependencies: Record<string, string> };
    expect(Object.keys(main.optionalDependencies).sort()).toEqual(NPM_PLATFORMS.map(platformPackageName).sort());
    for (const version of Object.values(main.optionalDependencies)) expect(version).toBe(main.version);
  });

  test('every npm platform has a compile target writing into its package', () => {
    for (const platform of NPM_PLATFORMS) {
      const target = BINARY_TARGETS.find((candidate) => candidate.npm === platform);
      expect(target?.outDir).toBe(join('npm', platformKey(platform), 'bin'));
    }
  });
});

function readJson(pathFromPackageRoot: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(PACKAGE_ROOT, pathFromPackageRoot), 'utf8')) as Record<string, unknown>;
}

function currentVersion(): string {
  const crate = readFileSync(CRATE_MANIFEST, 'utf8');
  const main = readJson('package.json') as { version: string };
  // Guard the test's own assumption: it compares against the in-sync state.
  expect(crate).toContain(`version = "${main.version}"`);
  return main.version;
}
