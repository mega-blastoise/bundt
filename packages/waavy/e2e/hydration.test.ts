/**
 * Real-browser hydration (P1 T15 acceptance).
 *
 * A throwaway Bun server plays the host: it renders pages through
 * `createRenderer` and serves the release's client directory at `/assets/`,
 * exactly as a production host would. Chromium (Playwright) then loads pages
 * and interacts with them.
 *
 * Requires `bun run build` and `bunx playwright install chromium`.
 */

import { join, normalize } from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { type Browser, chromium, type Page } from 'playwright';

import { RELEASE_CLIENT_DIR } from '../src/core/manifest';
import { createRenderer } from '../src/runtime/renderer';
import { buildFixtureRelease, type FixtureRelease } from '../test/support/fixture';

/** Value React must render as text, and that must never execute. */
const HOSTILE_LABEL = '</script><script>window.__pwned = true</script>';

let fixture: FixtureRelease;
let server: ReturnType<typeof Bun.serve>;
let browser: Browser;

beforeAll(async () => {
  fixture = await buildFixtureRelease();
  const renderer = await createRenderer({ release: fixture.dir });
  const clientDir = join(fixture.dir, RELEASE_CLIENT_DIR);

  server = Bun.serve({
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/assets/')) {
        // normalize() + prefix check keeps requests inside the client dir.
        const file = normalize(join(clientDir, url.pathname.slice('/assets/'.length)));
        if (!file.startsWith(clientDir)) return new Response('forbidden', { status: 403 });
        const asset = Bun.file(file);
        return (await asset.exists()) ? new Response(asset) : new Response('not found', { status: 404 });
      }
      const props: unknown = JSON.parse(url.searchParams.get('props') ?? '{}');
      const { html } = await renderer.render({ v: 1, page: url.pathname.slice(1), props });
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
  });
  browser = await chromium.launch();
}, 60_000);

afterAll(async () => {
  await browser?.close();
  server?.stop(true);
  await fixture?.dispose();
});

/** Opens a page, recording console errors and uncaught exceptions. */
async function open(path: string, props: Record<string, unknown> = {}): Promise<{ page: Page; errors: string[] }> {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  const query = new URLSearchParams({ props: JSON.stringify(props) });
  await page.goto(`${server.url.origin}/${path}?${query}`, { waitUntil: 'networkidle' });
  return { page, errors };
}

describe('hydration in Chromium', () => {
  test('counter becomes interactive with the server props', async () => {
    const { page, errors } = await open('counter', { label: 'Clicks', initial: 3 });
    expect(await page.textContent('#count')).toBe('3');
    await page.click('#increment');
    await page.waitForFunction(() => document.querySelector('#count')?.textContent === '4');
    expect(await page.textContent('#count')).toBe('4');
    expect(errors).toEqual([]);
    await page.close();
  });

  test('hostile props render as text and never execute', async () => {
    const { page, errors } = await open('counter', { label: HOSTILE_LABEL, initial: 0 });
    expect(await page.textContent('#label')).toBe(HOSTILE_LABEL);
    expect(await page.evaluate(() => (window as unknown as { __pwned?: boolean }).__pwned)).toBeUndefined();
    // Still hydrated: the props survived the round trip intact.
    await page.click('#increment');
    await page.waitForFunction(() => document.querySelector('#count')?.textContent === '1');
    expect(errors).toEqual([]);
    await page.close();
  });

  test('page CSS is linked and applied', async () => {
    const { page, errors } = await open('styled');
    const color = await page.$eval('#styled', (element) => getComputedStyle(element).color);
    expect(color).toBe('rgb(12, 34, 56)');
    expect(errors).toEqual([]);
    await page.close();
  });
});
