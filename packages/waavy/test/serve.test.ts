/**
 * `waavy serve` HTTP contract (P2 T3), against the compiled binary on both a
 * unix socket and a TCP port. Interruption semantics that need a renderer
 * failing mid-stream are covered in-process by `http-transport.test.ts`.
 */

import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { buildFixtureRelease, CLI_BINARY, type FixtureRelease } from './support/fixture';
import { postRender, serveFetch, type ServeProcess, startServe } from './support/serve';

let fixture: FixtureRelease;
let scratch: string;

beforeAll(async () => {
  if (!existsSync(CLI_BINARY)) throw new Error('dist/bin/waavy is missing; run `bun run build:binary`');
  fixture = await buildFixtureRelease();
  scratch = await mkdtemp(join(tmpdir(), 'waavy-serve-'));
});
afterAll(async () => {
  await fixture.dispose();
  await rm(scratch, { recursive: true, force: true });
});

/** Both listen modes, each with its own server process. */
const MODES = [
  ['unix socket', () => ['--socket', join(scratch, `${crypto.randomUUID()}.sock`)]],
  ['tcp port', () => ['--port', '0']]
] as const;

describe.each(MODES)('serve over %s', (_label, listenArgs) => {
  let server: ServeProcess;

  beforeAll(async () => {
    server = await startServe([CLI_BINARY], ['--release', fixture.dir, ...listenArgs()]);
  });
  afterAll(async () => {
    expect(await server.stop()).toBe(0);
  });

  test('GET /health reports the build', async () => {
    const response = await serveFetch(server, '/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      buildId: fixture.manifest.buildId,
      protocolVersion: 1,
      waavyVersion: expect.any(String)
    });
  });

  test('buffered render returns the full document with headers', async () => {
    const response = await postRender(server, { v: 1, page: 'counter', props: { label: 'L', initial: 7 } });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('waavy-build-id')).toBe(fixture.manifest.buildId);
    expect(response.headers.get('waavy-recoverable-errors')).toBe('0');
    expect(response.headers.get('waavy-request-id')).toBeTruthy();
    const html = await response.text();
    expect(html).toContain('<span id="count">7</span>');
    expect(html).toContain(`/assets/${fixture.manifest.pages['counter']!.client}`);
    expect(html.endsWith('</body></html>')).toBe(true);
  });

  test('echoes x-request-id', async () => {
    const response = await postRender(server, { v: 1, page: 'styled' }, {
      headers: { 'content-type': 'application/json', 'x-request-id': 'req-123' }
    });
    expect(response.headers.get('waavy-request-id')).toBe('req-123');
  });

  test('recoverable boundary errors are counted, not failures', async () => {
    const response = await postRender(server, { v: 1, page: 'boundary' });
    expect(response.status).toBe(200);
    expect(response.headers.get('waavy-recoverable-errors')).toBe('1');
  });

  test('streamed render produces the same document', async () => {
    const request = { v: 1, page: 'counter', props: { label: 'S', initial: 1 } };
    const buffered = await (await postRender(server, request)).text();
    const response = await postRender(server, { ...request, stream: true });
    expect(response.status).toBe(200);
    expect(response.headers.get('waavy-recoverable-errors')).toBeNull();
    expect(await response.text()).toBe(buffered);
  });

  test.each([
    [{ v: 1, page: 'broken' }, 500, 'RENDER_FAILED'],
    [{ v: 1, page: 'nope' }, 404, 'PAGE_NOT_FOUND'],
    [{ v: 1, page: 'counter', props: [] }, 400, 'INVALID_REQUEST'],
    [{ page: 'counter' }, 400, 'INVALID_REQUEST']
  ] as const)('%p → %d %s', async (body, status, code) => {
    for (const stream of [false, true]) {
      const response = await postRender(server, { ...body, stream });
      expect(response.status).toBe(status);
      expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
      expect(await response.json()).toMatchObject({ error: { code } });
    }
  });

  test('malformed JSON → 400', async () => {
    const response = await serveFetch(server, '/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{nope'
    });
    expect(response.status).toBe(400);
  });

  test('non-JSON content type → 400', async () => {
    const response = await serveFetch(server, '/render', { method: 'POST', body: 'v=1' });
    expect(response.status).toBe(400);
  });

  test('body over the limit → 413', async () => {
    const response = await postRender(server, { v: 1, page: 'counter', props: { big: 'x'.repeat(11 * 1024 * 1024) } });
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ error: { code: 'INVALID_REQUEST' } });
  });

  test('unknown routes and methods → 404', async () => {
    expect((await serveFetch(server, '/nope')).status).toBe(404);
    expect((await serveFetch(server, '/render')).status).toBe(404);
    // Production serves no assets; the host does.
    expect((await serveFetch(server, `/assets/${fixture.manifest.pages['counter']!.client}`)).status).toBe(404);
  });

  test('a pending boundary completes at the request deadline', async () => {
    const response = await postRender(server, { v: 1, page: 'slow', timeoutMs: 50 });
    expect(response.status).toBe(200);
    expect(response.headers.get('waavy-recoverable-errors')).toBe('1');
  });

  test('a client abort leaves the server healthy', async () => {
    const controller = new AbortController();
    const pending = postRender(server, { v: 1, page: 'slow', timeoutMs: 5000 }, { signal: controller.signal });
    setTimeout(() => controller.abort(), 50);
    expect(pending).rejects.toThrow();
    await pending.catch(() => undefined);
    expect((await serveFetch(server, '/health')).status).toBe(200);
  });

  test('logs one JSON access line per request', () => {
    const access = server.logs.filter((record) => record['type'] === 'access');
    expect(access.length).toBeGreaterThan(5);
    expect(access[0]).toMatchObject({ id: expect.any(String), method: expect.any(String), status: expect.any(Number) });
  });
});

describe('serve lifecycle', () => {
  test('SIGTERM lets an in-flight request finish, exits 0, and removes the socket', async () => {
    const socket = join(scratch, 'drain.sock');
    const server = await startServe([CLI_BINARY], ['--release', fixture.dir, '--socket', socket]);
    const pending = postRender(server, { v: 1, page: 'slow', timeoutMs: 400 });
    await Bun.sleep(100);
    const exited = server.stop();
    const response = await pending;
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('</body></html>');
    expect(await exited).toBe(0);
    expect(existsSync(socket)).toBe(false);
  });

  test('a stale socket file is replaced; a live one is refused', async () => {
    const socket = join(scratch, 'stale.sock');
    // A SIGKILLed listener leaves a real socket file with nobody behind it.
    const crashed = Bun.spawn(['bun', '--eval', `Bun.listen({ unix: ${JSON.stringify(socket)}, socket: { data() {} } }); setInterval(() => {}, 1000);`]);
    while (!existsSync(socket)) await Bun.sleep(20);
    crashed.kill('SIGKILL');
    await crashed.exited;
    expect(existsSync(socket)).toBe(true);

    const first = await startServe([CLI_BINARY], ['--release', fixture.dir, '--socket', socket]);
    const second = startServe([CLI_BINARY], ['--release', fixture.dir, '--socket', socket]);
    expect(second).rejects.toThrow('already listening');
    await second.catch(() => undefined);
    expect(await first.stop()).toBe(0);
  });

  test('an invalid release fails before listening with a JSON error', async () => {
    const child = Bun.spawn([CLI_BINARY, 'serve', '--release', join(scratch, 'missing'), '--port', '0'], {
      stderr: 'pipe'
    });
    const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
    expect(exitCode).toBe(30);
    expect(JSON.parse(stderr.trim())).toMatchObject({ error: { code: 'RELEASE_INVALID' } });
  });

  test.each([
    [['--port', '0', '--socket', 'x.sock'], 'exactly one'],
    [[], 'exactly one'],
    [['--port', 'abc'], '--port'],
    [['--port', '0', '--log-level', 'loud'], '--log-level']
  ])('flags %p are rejected', async (args, fragment) => {
    const child = Bun.spawn([CLI_BINARY, 'serve', '--release', fixture.dir, ...args], { stderr: 'pipe' });
    const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
    expect(exitCode).toBe(10);
    expect(stderr).toContain(fragment);
  });
});
