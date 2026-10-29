/**
 * End to end through a Rust host (P2 T10): Chromium → axum example →
 * `crates/waavy` Client → compiled `waavy serve` → fixture release, with axum
 * serving the client assets.
 *
 * Opt-in (needs a Rust toolchain): `WAAVY_E2E_AXUM=1 bun test e2e/axum.test.ts`.
 * Requires `bun run build`, `bun run build:binary`, and Playwright Chromium.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { Subprocess } from 'bun';
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { type Browser, chromium } from 'playwright';

import { buildFixtureRelease, CLI_BINARY, type FixtureRelease, PACKAGE_ROOT } from '../test/support/fixture';
import { type ServeProcess, startServe } from '../test/support/serve';

const ENABLED = process.env['WAAVY_E2E_AXUM'] === '1';
const REPO_ROOT = resolve(PACKAGE_ROOT, '..', '..');

/** First-time `cargo run` compiles axum and friends. */
const AXUM_STARTUP_TIMEOUT_MS = 300_000;

let fixture: FixtureRelease;
let scratch: string;
let renderer: ServeProcess;
let axum: Subprocess<'ignore', 'pipe', 'inherit'>;
let origin: string;
let browser: Browser;

/** Asks the OS for a free TCP port. */
async function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => (typeof address === 'object' && address !== null ? resolvePort(address.port) : reject()));
    });
  });
}

/** Resolves once the child prints its `listening on` line. */
async function waitForListening(child: Subprocess<'ignore', 'pipe', 'inherit'>): Promise<void> {
  const decoder = new TextDecoder();
  let output = '';
  for await (const chunk of child.stdout) {
    output += decoder.decode(chunk, { stream: true });
    if (output.includes('listening on')) return;
  }
  throw new Error(`axum example exited before listening: ${output}`);
}

describe.skipIf(!ENABLED)('Rust host (axum) in Chromium', () => {
  beforeAll(async () => {
    fixture = await buildFixtureRelease();
    scratch = await mkdtemp(join(tmpdir(), 'waavy-axum-'));
    const socket = join(scratch, 'waavy.sock');
    renderer = await startServe([CLI_BINARY], ['--release', fixture.dir, '--socket', socket]);

    const port = await freePort();
    origin = `http://127.0.0.1:${port}`;
    axum = Bun.spawn(['cargo', 'run', '--quiet', '-p', 'waavy', '--example', 'axum'], {
      cwd: REPO_ROOT,
      env: { ...process.env, WAAVY_SOCKET: socket, WAAVY_RELEASE: fixture.dir, PORT: String(port) },
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'inherit'
    });
    await waitForListening(axum);
    browser = await chromium.launch();
  }, AXUM_STARTUP_TIMEOUT_MS);

  afterAll(async () => {
    await browser?.close();
    axum?.kill();
    await renderer?.stop();
    await fixture?.dispose();
    await rm(scratch, { recursive: true, force: true });
  });

  test('a page rendered through Rust hydrates and responds to clicks', async () => {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto(`${origin}/counter/3`, { waitUntil: 'networkidle' });
    expect(await page.title()).toBe('Counter');
    expect(await page.textContent('#count')).toBe('3');
    await page.click('#increment');
    await page.waitForFunction(() => document.querySelector('#count')?.textContent === '4');
    expect(errors).toEqual([]);
    await page.close();
  });

  test('assets are served by the Rust host', async () => {
    const page = await browser.newPage();
    await page.goto(origin, { waitUntil: 'networkidle' });
    const color = await page.$eval('#styled', (element) => getComputedStyle(element).color);
    expect(color).toBe('rgb(12, 34, 56)');
    await page.close();
  });
});
