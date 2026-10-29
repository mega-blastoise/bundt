/**
 * `buildRelease` against the real fixture project (P1 T8 acceptance).
 */

import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { buildRelease } from '../src/build/build-release';
import { isWaavyError } from '../src/core/errors';
import { MANIFEST_FILE_NAME, parseManifest, RELEASE_CLIENT_DIR } from '../src/core/manifest';
import { buildFixtureRelease, FIXTURE_ROOT, type FixtureRelease } from './support/fixture';

let fixture: FixtureRelease;

beforeAll(async () => {
  fixture = await buildFixtureRelease();
});
afterAll(() => fixture.dispose());

describe('buildRelease', () => {
  test('writes a manifest that validates and lists every page', async () => {
    const json: unknown = JSON.parse(await readFile(join(fixture.dir, MANIFEST_FILE_NAME), 'utf8'));
    const manifest = parseManifest(json, 'fixture');
    expect(Object.keys(manifest.pages).sort()).toEqual(['boundary', 'broken', 'counter', 'slow', 'styled']);
    expect(manifest.server).toBe('server/entry.js');
    expect(manifest.publicPath).toBe('/assets/');
  });

  test('every referenced file exists', () => {
    const { manifest } = fixture;
    expect(existsSync(join(fixture.dir, manifest.server))).toBe(true);
    for (const assets of Object.values(manifest.pages)) {
      for (const file of [assets.client, ...assets.css, ...assets.preload]) {
        expect(existsSync(join(fixture.dir, RELEASE_CLIENT_DIR, file))).toBe(true);
      }
    }
  });

  test('records CSS for the page that imports it', () => {
    expect(fixture.manifest.pages['styled']?.css).toHaveLength(1);
    expect(fixture.manifest.pages['counter']?.css).toEqual([]);
  });

  test('the server entry is self-contained (React bundled, no bare imports)', async () => {
    const source = await readFile(join(fixture.dir, fixture.manifest.server), 'utf8');
    expect(source).not.toMatch(/from\s*["']react(-dom)?(\/[\w.]+)?["']/);
    expect(source).not.toMatch(/require\(["']react/);
  });

  test('removes generated entries and staging directories', () => {
    expect(existsSync(join(FIXTURE_ROOT, 'node_modules', '.cache', 'waavy', 'build', fixture.manifest.buildId))).toBe(
      false
    );
    expect(existsSync(`${fixture.dir}.staging-${fixture.manifest.buildId}`)).toBe(false);
  });
});

describe('buildRelease failures', () => {
  // Broken inputs live inside the fixture so `react` still resolves.
  const brokenConfig = join(FIXTURE_ROOT, '.test-broken.config.ts');
  const brokenPage = join(FIXTURE_ROOT, '.test-broken-page.tsx');
  let outRoot: string;

  beforeAll(async () => {
    outRoot = await mkdtemp(join(tmpdir(), 'waavy-broken-'));
    await writeFile(brokenPage, 'export default function Broken( { return <p/> }\n');
    await writeFile(brokenConfig, "export default { pages: { bad: './.test-broken-page.tsx' } };\n");
  });
  afterAll(async () => {
    await rm(brokenConfig, { force: true });
    await rm(brokenPage, { force: true });
    await rm(outRoot, { recursive: true, force: true });
  });

  test('a bundling error is BUILD_FAILED and leaves the previous release intact', async () => {
    const outDir = join(outRoot, 'release');
    const good = await buildRelease({ root: FIXTURE_ROOT, outDir });
    try {
      await buildRelease({ root: FIXTURE_ROOT, configPath: brokenConfig, outDir });
      throw new Error('expected the build to fail');
    } catch (error) {
      expect(isWaavyError(error) && error.code).toBe('BUILD_FAILED');
    }
    const manifest: unknown = JSON.parse(await readFile(join(outDir, MANIFEST_FILE_NAME), 'utf8'));
    expect(parseManifest(manifest, 'after failure').buildId).toBe(good.manifest.buildId);
  });

  test('a missing config is CONFIG_INVALID', async () => {
    try {
      await buildRelease({ root: outRoot });
      throw new Error('expected the build to fail');
    } catch (error) {
      expect(isWaavyError(error) && error.code).toBe('CONFIG_INVALID');
    }
  });
});
