/**
 * HTTP transport behaviors that need a misbehaving renderer (P2 T3): a
 * streaming render that fails after headers were sent must reach the client
 * as an *incomplete* response, never as a clean end of body.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { WaavyError } from '../src/core/errors';
import type { Renderer } from '../src/runtime/renderer';
import { createLogger } from '../src/transport/access-log';
import { type RunningHttpServer, startHttpServer } from '../src/transport/http-server';

const encoder = new TextEncoder();

/** A stream that emits `chunks`, then errors (or closes, when `fail` is false). */
function scriptedStream(chunks: readonly string[], fail: boolean): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream({
    async pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index++]));
        await Bun.sleep(10);
        return;
      }
      if (fail) controller.error(new WaavyError('RENDER_FAILED', 'late failure'));
      else controller.close();
    }
  });
}

/** A renderer whose streaming output fails mid-way for page "late-fail". */
const fakeRenderer: Renderer = {
  buildId: 'fake',
  pages: ['ok', 'late-fail'],
  render: async () => ({ html: '<p>ok</p>', buildId: 'fake', recoverableErrors: [] }),
  renderStream: async (request) => {
    const page = (request as { page?: string }).page;
    return {
      stream: scriptedStream(['<!doctype html><p>', 'partial'], page === 'late-fail'),
      buildId: 'fake',
      recoverableErrors: () => []
    };
  },
  close: async () => undefined
};

let server: RunningHttpServer;
const logLines: string[] = [];

beforeAll(async () => {
  server = await startHttpServer({
    listen: { kind: 'tcp', port: 0 },
    current: () => ({ renderer: fakeRenderer }),
    logger: createLogger('info', (line) => logLines.push(line))
  });
});
afterAll(() => server.close());

function postStream(page: string): Promise<Response> {
  return fetch(`http://127.0.0.1:${server.port}/render`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ v: 1, page, stream: true })
  });
}

describe('streaming failures', () => {
  test('a clean stream ends normally', async () => {
    const response = await postStream('ok');
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<!doctype html><p>partial');
  });

  test('a late failure makes the body read reject (incomplete response)', async () => {
    const response = await postStream('late-fail');
    expect(response.status).toBe(200);
    expect(response.text()).rejects.toThrow();
    await response.text().catch(() => undefined);
  });

  test('the late failure is logged with its code and the server stays healthy', async () => {
    await Bun.sleep(20);
    const failures = logLines
      .map((line) => JSON.parse(line) as Record<string, unknown>)
      .filter((record) => record['type'] === 'access' && record['page'] === 'late-fail');
    expect(failures[0]).toMatchObject({ status: 200, error: 'RENDER_FAILED', stream: true });
    const health = await fetch(`http://127.0.0.1:${server.port}/health`);
    expect(health.status).toBe(200);
  });
});
