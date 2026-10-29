/**
 * `waavy serve --dev` (P2 T2): rebuild on change, keep serving the last good
 * build when a change breaks, and serve client assets itself.
 *
 * Runs against a throwaway copy of the fixture placed *inside* the fixture
 * directory, so `react` and `@bundt/waavy` still resolve from the fixture's
 * node_modules.
 */

import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { assertPackageBuilt, CLI_BINARY, FIXTURE_ROOT } from './support/fixture';
import { postRender, serveFetch, type ServeProcess, startServe } from './support/serve';

const projectDir = join(FIXTURE_ROOT, `.dev-test-${crypto.randomUUID()}`);
const counterPage = join(projectDir, 'pages', 'counter.tsx');
let server: ServeProcess;

beforeAll(async () => {
  assertPackageBuilt();
  await cp(join(FIXTURE_ROOT, 'pages'), join(projectDir, 'pages'), { recursive: true });
  await cp(join(FIXTURE_ROOT, 'waavy.config.ts'), join(projectDir, 'waavy.config.ts'));
  server = await startServe([CLI_BINARY], ['--dev', '--root', projectDir, '--port', '0', '--log-level', 'info']);
}, 30_000);

afterAll(async () => {
  await server?.stop();
  await rm(projectDir, { recursive: true, force: true });
});

const renderCounter = async () =>
  (await postRender(server, { v: 1, page: 'counter', props: { label: 'x', initial: 1 } })).text();

/** Polls `check` until it returns true or the timeout passes. */
async function eventually(check: () => Promise<boolean>, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await Bun.sleep(100);
  }
  throw new Error('condition not met in time');
}

describe('serve --dev', () => {
  test('serves the initial build and its client assets', async () => {
    const html = await renderCounter();
    expect(html).toContain('Count: ');
    const script = /<script type="module" src="([^"]+)"/.exec(html)?.[1];
    expect(script).toBeDefined();
    const asset = await serveFetch(server, script!);
    expect(asset.status).toBe(200);
    expect(asset.headers.get('content-type')).toContain('javascript');
  });

  test('picks up an edit to a page', async () => {
    const source = await readFile(counterPage, 'utf8');
    await writeFile(counterPage, source.replace('Count: ', 'Total: '));
    await eventually(async () => (await renderCounter()).includes('Total: '));
  });

  test('keeps serving the last good build when an edit breaks the page', async () => {
    const before = server.logs.filter((record) => record['event'] === 'dev_build_failed').length;
    await writeFile(counterPage, 'export default function Counter( {\n');
    await eventually(async () => server.logs.filter((record) => record['event'] === 'dev_build_failed').length > before);
    expect(await renderCounter()).toContain('Total: ');
  });
});
