/**
 * Render orchestration: deadlines, cancellation, and error classification
 * around a release's `renderToReadableStream` (see `release-abi.ts`).
 *
 * Terms (ARCHITECTURE.md §5.2):
 * - **Render failure** — the shell could not be rendered. No usable HTML
 *   exists. Raised as `RENDER_FAILED`.
 * - **Timeout** — the deadline passed. Before the shell is ready this is a
 *   failure (`RENDER_TIMEOUT`). After the shell is ready waavy aborts the
 *   render: React flushes fallbacks for the pending Suspense boundaries and
 *   the browser renders them, so the document still completes.
 * - **Recoverable error** — anything React reports through `onError` while
 *   the shell still succeeds: errors thrown inside Suspense boundaries
 *   (React retries them on the client) and boundaries aborted by a timeout.
 *   The document is valid; these are reported, never thrown.
 *
 * This module is runtime-agnostic: it only uses standard Web APIs and never
 * imports React (the release brings its own copy).
 */

import { describeError, isWaavyError, WaavyError } from './errors';
import type { ReactRenderStream, RenderToReadableStream } from './release-abi';
import { readStreamToString } from './streams';

/** A non-fatal problem React recovered from during a render. */
export type RecoverableError = {
  /** `"timeout"` when the boundary was aborted by the render deadline. */
  reason: 'error' | 'timeout';
  /** Human-readable description. */
  message: string;
  /** React's error digest, when the error carried one. */
  digest?: string;
};

/** Options shared by both render modes. */
export type RenderOptions = {
  /** Render deadline in milliseconds. */
  timeoutMs: number;
  /** Aborts the render when the caller goes away (e.g. client disconnect). */
  signal?: AbortSignal;
};

/** Result of a buffered render. */
export type BufferedRender = {
  /** The complete HTML of the page component (no document shell). */
  body: string;
  /** Problems React recovered from. */
  recoverableErrors: readonly RecoverableError[];
};

/** Result of a streaming render; resolved once the shell is ready. */
export type StreamingRender = {
  /** The page component's HTML as it is produced (no document shell). */
  body: ReadableStream<Uint8Array>;
  /**
   * Problems React recovered from *so far*. Read it after `body` has been
   * fully consumed for the final list.
   */
  recoverableErrors: () => readonly RecoverableError[];
};

/**
 * Renders a page and waits for every Suspense boundary to settle (or for the
 * deadline, whichever comes first).
 *
 * @throws {WaavyError} `RENDER_FAILED` or `RENDER_TIMEOUT`.
 */
export async function renderBuffered(
  render: RenderToReadableStream,
  pageId: string,
  props: Record<string, unknown>,
  options: RenderOptions
): Promise<BufferedRender> {
  const session = await startRenderSession(render, pageId, props, options);
  try {
    const body = await readStreamToString(session.stream);
    return { body, recoverableErrors: session.recoverableErrors() };
  } catch (error) {
    throw renderFailure(error, pageId);
  } finally {
    session.dispose();
  }
}

/**
 * Renders a page and resolves as soon as its shell is ready, returning the
 * remaining output as a stream. Errors after this point surface as an error
 * on `body` (the stream ends without the rest of the document).
 *
 * @throws {WaavyError} `RENDER_FAILED` or `RENDER_TIMEOUT` if the shell fails.
 */
export async function renderStreaming(
  render: RenderToReadableStream,
  pageId: string,
  props: Record<string, unknown>,
  options: RenderOptions
): Promise<StreamingRender> {
  const session = await startRenderSession(render, pageId, props, options);
  return { body: session.stream, recoverableErrors: session.recoverableErrors };
}

/** Internal state of one in-flight render. */
type RenderSession = {
  stream: ReactRenderStream;
  recoverableErrors: () => readonly RecoverableError[];
  /** Releases the deadline timer and the caller-signal listener. Idempotent. */
  dispose: () => void;
};

/**
 * Starts a render with a deadline and caller cancellation wired up, and waits
 * for the shell. Shared by both render modes so their semantics cannot drift.
 */
async function startRenderSession(
  render: RenderToReadableStream,
  pageId: string,
  props: Record<string, unknown>,
  options: RenderOptions
): Promise<RenderSession> {
  const controller = new AbortController();
  const reported: unknown[] = [];

  // A unique reason object lets us tell "aborted by our deadline" apart from
  // every other error React reports.
  const timeoutReason = new WaavyError(
    'RENDER_TIMEOUT',
    `Render of "${pageId}" exceeded ${options.timeoutMs}ms`,
    { page: pageId }
  );
  const timer = setTimeout(() => controller.abort(timeoutReason), options.timeoutMs);

  const abortFromCaller = () => {
    controller.abort(new WaavyError('RENDER_FAILED', `Render of "${pageId}" was aborted by the caller`, { page: pageId }));
  };
  if (options.signal?.aborted) abortFromCaller();
  else options.signal?.addEventListener('abort', abortFromCaller, { once: true });

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortFromCaller);
  };

  let stream: ReactRenderStream;
  try {
    stream = await render(pageId, props, {
      signal: controller.signal,
      onError: (error) => {
        reported.push(error);
      }
    });
  } catch (error) {
    dispose();
    throw shellFailure(error, controller.signal, pageId);
  }

  // `allReady` settles when every boundary is done, the render is aborted, or
  // it fails. Either way the deadline no longer matters. Handling rejection
  // here also prevents an unhandled-rejection crash for streaming renders.
  stream.allReady.then(dispose, dispose);

  return {
    stream,
    recoverableErrors: () => reported.map((error) => toRecoverableError(error, timeoutReason)),
    dispose
  };
}

/** Classifies a rejected shell: our own abort reasons win over React's error. */
function shellFailure(error: unknown, signal: AbortSignal, pageId: string): WaavyError {
  if (signal.aborted && isWaavyError(signal.reason)) return signal.reason;
  return renderFailure(error, pageId);
}

/** Wraps an error that happened after the shell (or while reading it). */
function renderFailure(error: unknown, pageId: string): WaavyError {
  if (isWaavyError(error)) return error;
  return new WaavyError('RENDER_FAILED', `Render of "${pageId}" failed: ${describeError(error)}`, {
    page: pageId,
    cause: error
  });
}

function toRecoverableError(error: unknown, timeoutReason: WaavyError): RecoverableError {
  const reason = error === timeoutReason ? 'timeout' : 'error';
  const digest = readDigest(error);
  return {
    reason,
    message: describeError(error),
    ...(digest === undefined ? {} : { digest })
  };
}

/** React attaches a string `digest` to errors it has hashed for the client. */
function readDigest(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('digest' in error)) return undefined;
  return typeof error.digest === 'string' ? error.digest : undefined;
}
