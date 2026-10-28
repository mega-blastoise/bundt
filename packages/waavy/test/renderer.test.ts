/**
 * `createRenderer` and release validation against a built fixture release
 * (P1 T10 acceptance).
 */

import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { type ErrorCode, isWaavyError } from '../src/core/errors';
import { type Manifest, MANIFEST_FILE_NAME, RELEASE_CLIENT_DIR } from '../src/core/manifest';
import { readStreamToString } from '../src/core/streams';
import { createRenderer, type Renderer } from '../src/runtime/renderer';
import { buildFixtureRelease, type FixtureRelease } from './support/fixture';

let fixture: FixtureRelease;
let renderer: Renderer;

beforeAll(async () => {
  fixture = await buildFixtureRelease();
  renderer = await createRenderer({ release: fixture.dir });
});
afterAll(() => fixture.dispose());

/** Awaits `promise`, expecting a WaavyError with `code`. */
async function expectCode(promise: Promise<unknown>, code: ErrorCode): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(isWaavyError(error) ? error.code : error).toBe(code);
    return;
  }
  throw new Error(`expected ${code}`);
}

describe('createRenderer', () => {
  test('exposes the release build and pages', () => {
    expect(renderer.buildId).toBe(fixture.manifest.buildId);
    expect([...renderer.pages].sort()).toEqual(['boundary', 'broken', 'counter', 'slow', 'styled']);
  });

  test('renders a document with assets and island', async () => {
    const { html, buildId, recoverableErrors } = await renderer.render({
      v: 1,
      page: 'styled',
      document: { title: 'Styled' }
    });
    const assets = fixture.manifest.pages['styled']!;
    expect(buildId).toBe(fixture.manifest.buildId);
    expect(recoverableErrors).toEqual([]);
    expect(html.startsWith('<!doctype html><html lang="en">')).toBe(true);
    expect(html).toContain('<title>Styled</title>');
    expect(html).toContain(`<link rel="stylesheet" href="/assets/${assets.css[0]}">`);
    expect(html).toContain(`<script type="module" src="/assets/${assets.client}"></script>`);
    expect(html).toContain(`<script type="application/json" id="waavy-data">`);
    expect(html).toContain('<div id="waavy-root"><h1 id="styled">Styled</h1></div>');
    expect(html.endsWith('</body></html>')).toBe(true);
  });

  test('streams the same document', async () => {
    const request = { v: 1, page: 'counter', props: { label: 'L', initial: 2 } } as const;
    const buffered = await renderer.render(request);
    const streamed = await renderer.renderStream(request);
    expect(await readStreamToString(streamed.stream)).toBe(buffered.html);
  });

  test('reports recoverable errors without failing', async () => {
    const result = await renderer.render({ v: 1, page: 'boundary' });
    expect(result.recoverableErrors).toHaveLength(1);
    expect(result.html).toContain('id="fallback"');
  });

  test('uses the request deadline over the release default', async () => {
    const result = await renderer.render({ v: 1, page: 'slow', timeoutMs: 30 });
    expect(result.recoverableErrors.map((error) => error.reason)).toEqual(['timeout']);
  });

  test.each([
    [{ v: 1, page: 'missing' }, 'PAGE_NOT_FOUND'],
    [{ v: 1, page: 'broken' }, 'RENDER_FAILED'],
    [{ v: 1 }, 'INVALID_REQUEST'],
    [{ v: 1, page: 'counter', props: 'nope' }, 'INVALID_REQUEST']
  ] as const)('%p → %s', async (request, code) => {
    await expectCode(renderer.render(request), code);
    await expectCode(renderer.renderStream(request), code);
  });
});

describe('release validation', () => {
  let scratch: string;

  beforeAll(async () => {
    scratch = await mkdtemp(join(tmpdir(), 'waavy-tamper-'));
  });
  afterAll(() => rm(scratch, { recursive: true, force: true }));

  /** Copies the fixture release, applies `tamper`, and returns the copy. */
  async function tamperedRelease(name: string, tamper: (dir: string, manifest: Manifest) => Promise<void>) {
    const dir = join(scratch, name);
    await cp(fixture.dir, dir, { recursive: true });
    const manifest = JSON.parse(await readFile(join(dir, MANIFEST_FILE_NAME), 'utf8')) as Manifest;
    await tamper(dir, manifest);
    return dir;
  }

  const writeManifest = (dir: string, manifest: Manifest) =>
    writeFile(join(dir, MANIFEST_FILE_NAME), JSON.stringify(manifest));

  test('missing directory → RELEASE_INVALID', async () => {
    await expectCode(createRenderer({ release: join(scratch, 'nope') }), 'RELEASE_INVALID');
  });

  test('corrupt manifest → RELEASE_INVALID', async () => {
    const dir = await tamperedRelease('corrupt', (d) => writeFile(join(d, MANIFEST_FILE_NAME), '{'));
    await expectCode(createRenderer({ release: dir }), 'RELEASE_INVALID');
  });

  test.each(['manifestVersion', 'abi', 'protocolVersion'] as const)('%s mismatch → VERSION_MISMATCH', async (field) => {
    const dir = await tamperedRelease(`version-${field}`, (d, manifest) => writeManifest(d, { ...manifest, [field]: 99 }));
    await expectCode(createRenderer({ release: dir }), 'VERSION_MISMATCH');
  });

  test('missing client asset → RELEASE_INVALID', async () => {
    const dir = await tamperedRelease('missing-asset', (d, manifest) =>
      rm(join(d, RELEASE_CLIENT_DIR, manifest.pages['counter']!.client))
    );
    await expectCode(createRenderer({ release: dir }), 'RELEASE_INVALID');
  });

  test('manifest/entry build mismatch → RELEASE_INVALID', async () => {
    const dir = await tamperedRelease('build-mismatch', (d, manifest) =>
      writeManifest(d, { ...manifest, buildId: 'someone-else' })
    );
    await expectCode(createRenderer({ release: dir }), 'RELEASE_INVALID');
  });

  test('manifest lists a page the entry lacks → RELEASE_INVALID', async () => {
    const dir = await tamperedRelease('extra-page', (d, manifest) =>
      writeManifest(d, { ...manifest, pages: { ...manifest.pages, ghost: manifest.pages['counter']! } })
    );
    await expectCode(createRenderer({ release: dir }), 'RELEASE_INVALID');
  });
});
