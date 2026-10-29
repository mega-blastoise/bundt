/**
 * Render semantics (ARCHITECTURE.md §5.2), exercised with real React through
 * the real release adapter (`defineRelease`).
 */

import { describe, expect, test } from 'bun:test';
import { Suspense, use } from 'react';

import { defineRelease } from '../entry-server';
import { isWaavyError, type WaavyError } from './errors';
import { renderBuffered, renderStreaming } from './render';
import { readStreamToString } from './streams';

const forever = new Promise<string>(() => undefined);

function Hello({ name }: { name: string }) {
  return <p>Hello {name}</p>;
}

function Throws(): never {
  throw new Error('kaboom');
}

function Forever() {
  return <span>{use(forever)}</span>;
}

/** Shell renders; a boundary child throws (recoverable). */
function BoundaryError() {
  return (
    <div>
      <Suspense fallback={<i>fallback</i>}>
        <Throws />
      </Suspense>
    </div>
  );
}

/** Shell renders; a boundary never resolves (needs the deadline). */
function SlowBoundary() {
  return (
    <div>
      <h1>shell</h1>
      <Suspense fallback={<i>pending</i>}>
        <Forever />
      </Suspense>
    </div>
  );
}

/** Suspends outside any boundary: the shell itself never becomes ready. */
function SlowShell() {
  return <Forever />;
}

const release = defineRelease({
  buildId: 'test',
  pages: { hello: Hello, throws: Throws, boundary: BoundaryError, slow: SlowBoundary, 'slow-shell': SlowShell }
});
const render = release.renderToReadableStream;

/** Awaits `promise`, expecting a WaavyError, and returns it. */
async function expectWaavyError(promise: Promise<unknown>): Promise<WaavyError> {
  try {
    await promise;
  } catch (error) {
    if (isWaavyError(error)) return error;
    throw error;
  }
  throw new Error('expected the promise to reject');
}

describe('renderBuffered', () => {
  test('renders a page with props', async () => {
    const result = await renderBuffered(render, 'hello', { name: 'Ada' }, { timeoutMs: 1000 });
    expect(result.body).toBe('<p>Hello <!-- -->Ada</p>');
    expect(result.recoverableErrors).toEqual([]);
  });

  test('decodes multi-byte characters', async () => {
    const result = await renderBuffered(render, 'hello', { name: 'héllo 🌊 世界' }, { timeoutMs: 1000 });
    expect(result.body).toContain('héllo 🌊 世界');
  });

  test('reports errors inside Suspense boundaries as recoverable', async () => {
    const result = await renderBuffered(render, 'boundary', {}, { timeoutMs: 1000 });
    expect(result.body).toContain('<i>fallback</i>');
    expect(result.recoverableErrors).toEqual([{ reason: 'error', message: 'kaboom' }]);
  });

  test('a shell error is RENDER_FAILED', async () => {
    const error = await expectWaavyError(renderBuffered(render, 'throws', {}, { timeoutMs: 1000 }));
    expect(error.code).toBe('RENDER_FAILED');
    expect(error.page).toBe('throws');
    expect(error.message).toContain('kaboom');
  });

  test('a shell that is not ready by the deadline is RENDER_TIMEOUT', async () => {
    const error = await expectWaavyError(renderBuffered(render, 'slow-shell', {}, { timeoutMs: 50 }));
    expect(error.code).toBe('RENDER_TIMEOUT');
  });

  test('a boundary pending at the deadline completes with a timeout warning', async () => {
    const result = await renderBuffered(render, 'slow', {}, { timeoutMs: 50 });
    expect(result.body).toContain('<h1>shell</h1>');
    expect(result.body).toContain('<i>pending</i>');
    expect(result.recoverableErrors.map((error) => error.reason)).toEqual(['timeout']);
  });

  test('caller abort before the shell is RENDER_FAILED', async () => {
    const controller = new AbortController();
    const pending = renderBuffered(render, 'slow-shell', {}, { timeoutMs: 10_000, signal: controller.signal });
    controller.abort();
    const error = await expectWaavyError(pending);
    expect(error.code).toBe('RENDER_FAILED');
    expect(error.message).toContain('aborted by the caller');
  });

  test('an already-aborted signal fails immediately', async () => {
    const error = await expectWaavyError(
      renderBuffered(render, 'hello', { name: 'x' }, { timeoutMs: 10_000, signal: AbortSignal.abort() })
    );
    expect(error.code).toBe('RENDER_FAILED');
  });
});

describe('renderStreaming', () => {
  test('resolves at the shell and streams the rest', async () => {
    const result = await renderStreaming(render, 'hello', { name: 'Grace' }, { timeoutMs: 1000 });
    expect(await readStreamToString(result.body)).toBe('<p>Hello <!-- -->Grace</p>');
    expect(result.recoverableErrors()).toEqual([]);
  });

  test('shell failures reject before any output', async () => {
    const error = await expectWaavyError(renderStreaming(render, 'throws', {}, { timeoutMs: 1000 }));
    expect(error.code).toBe('RENDER_FAILED');
  });

  test('recoverable errors are visible once the body is consumed', async () => {
    const result = await renderStreaming(render, 'slow', {}, { timeoutMs: 50 });
    await readStreamToString(result.body);
    expect(result.recoverableErrors().map((error) => error.reason)).toEqual(['timeout']);
  });
});

describe('deadline timer', () => {
  test('is cleared after a fast render, so the process can exit immediately', async () => {
    // A leaked 60s timer would keep this child process alive; it must exit well before.
    const script = `
      import { renderBuffered } from ${JSON.stringify(`${import.meta.dir}/render.ts`)};
      const render = async () => Object.assign(new Response('<p>ok</p>').body, { allReady: Promise.resolve() });
      const result = await renderBuffered(render, 'p', {}, { timeoutMs: 60000 });
      console.log(result.body);
    `;
    const started = performance.now();
    const child = Bun.spawn(['bun', '--eval', script], { stdout: 'pipe', stderr: 'pipe' });
    const [exitCode, stdout] = await Promise.all([child.exited, new Response(child.stdout).text()]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('<p>ok</p>');
    expect(performance.now() - started).toBeLessThan(5000);
  });
});
