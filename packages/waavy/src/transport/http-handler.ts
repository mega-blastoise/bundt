/**
 * Request handling for `waavy serve` (ARCHITECTURE.md §5.2–5.3).
 *
 * Routes:
 * - `POST /render` — render a `RenderRequest` (JSON body).
 * - `GET  /health` — liveness plus the loaded build.
 * - `GET  <publicPath>*` — client assets, only when `assets` is configured
 *   (`--dev`); in production the host serves `client/` itself.
 *
 * Response semantics:
 * - Failures before any byte of HTML is sent are a JSON `ErrorBody` with the
 *   code's HTTP status (`413` for oversized bodies).
 * - Buffered renders (default) send a complete document with
 *   `Waavy-Recoverable-Errors`.
 * - Streaming renders send headers once the shell is ready. A later failure
 *   destroys the connection, so the chunked body ends without its terminator
 *   and every HTTP client reports an incomplete response (spike P2-S1:
 *   `node:http`'s `destroy()` does this per connection; `Bun.serve` cannot).
 * - A client disconnect aborts the render.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { normalize, sep } from 'node:path';

import { ERROR_CODES, toErrorBody, toWaavyError, WaavyError } from '../core/errors';
import { parseRenderRequest, PROTOCOL_VERSION, type RenderRequest } from '../core/protocol';
import { WAAVY_VERSION } from '../core/version';
import type { Renderer } from '../runtime/renderer';
import type { AccessLogEntry, Logger } from './access-log';
import { BodyTooLargeError, readJsonBody } from './http-body';

/** A streaming client that reads nothing for this long is disconnected. */
const WRITE_STALL_TIMEOUT_MS = 30_000;

/** Response headers set by waavy (lowercase, as Node normalizes them). */
export const HEADERS = {
  buildId: 'waavy-build-id',
  recoverableErrors: 'waavy-recoverable-errors',
  requestId: 'waavy-request-id'
} as const;

/** Static client assets served by the renderer itself (development only). */
export type ServedAssets = {
  /** URL prefix, e.g. `/assets/`. */
  publicPath: string;
  /** Absolute path of the release's client directory. */
  dir: string;
};

/** What the server is currently serving; a function so `--dev` can swap it. */
export type ServedRelease = {
  renderer: Renderer;
  assets?: ServedAssets;
};

/** Dependencies of the request handler. */
export type HandlerOptions = {
  current: () => ServedRelease;
  maxBodyBytes: number;
  logger: Logger;
};

/** Mutable per-request facts collected for the access log. */
type RequestLog = Omit<AccessLogEntry, 'ts' | 'ms'>;

/** Creates the `node:http` request listener. */
export function createRequestHandler(options: HandlerOptions) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    const started = performance.now();
    const url = new URL(request.url ?? '/', 'http://waavy.local');
    const log: RequestLog = {
      id: headerValue(request, 'x-request-id') ?? crypto.randomUUID(),
      method: request.method ?? 'GET',
      path: url.pathname,
      status: 0
    };
    response.setHeader(HEADERS.requestId, log.id);

    // Abort the render if the client goes away before we finish. Under Bun's
    // node:http a disconnect is only reported once we write again (spike
    // P2-S1c), so this mainly stops streaming renders early; buffered renders
    // are bounded by their deadline.
    const controller = new AbortController();
    response.on('close', () => {
      if (!response.writableFinished) {
        log.aborted = true;
        controller.abort();
      }
    });

    try {
      await route(request, response, url, controller.signal, log, options);
    } catch (error) {
      failRequest(response, error, log);
    } finally {
      // Deliberately not awaiting `finish`/`close`: Bun never emits them for a
      // response ended after the client disconnected (spike P2-S1c), which
      // would leak an in-flight request and stall graceful shutdown.
      options.logger.access({ ...log, ts: new Date().toISOString(), ms: Math.round(performance.now() - started) });
    }
  };
}

async function route(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  signal: AbortSignal,
  log: RequestLog,
  options: HandlerOptions
): Promise<void> {
  const served = options.current();

  if (url.pathname === '/render' && request.method === 'POST') {
    const renderRequest = parseRenderRequest(await readJsonBody(request, options.maxBodyBytes));
    log.page = renderRequest.page;
    log.stream = renderRequest.stream;
    await (renderRequest.stream ? renderStreamed : renderBuffered)(served.renderer, renderRequest, response, signal, log);
    return;
  }

  if (url.pathname === '/health' && request.method === 'GET') {
    sendJson(response, 200, {
      ok: true,
      buildId: served.renderer.buildId,
      protocolVersion: PROTOCOL_VERSION,
      waavyVersion: WAAVY_VERSION
    });
    log.status = 200;
    return;
  }

  if (served.assets !== undefined && request.method === 'GET' && url.pathname.startsWith(served.assets.publicPath)) {
    log.status = await sendAsset(response, served.assets, url.pathname.slice(served.assets.publicPath.length));
    return;
  }

  log.status = sendNotFound(response, `No route for ${request.method} ${url.pathname}`);
  log.error = 'INVALID_REQUEST';
}

type RenderMode = (
  renderer: Renderer,
  request: RenderRequest,
  response: ServerResponse,
  signal: AbortSignal,
  log: RequestLog
) => Promise<void>;

/** Buffered: render everything, then send it in one response. */
const renderBuffered: RenderMode = async (renderer, request, response, signal, log) => {
  const document = await renderer.render(request, { signal });
  if (signal.aborted) return;
  response.writeHead(200, {
    ...htmlHeaders(document.buildId),
    [HEADERS.recoverableErrors]: String(document.recoverableErrors.length)
  });
  response.end(document.html);
  log.status = 200;
  log.recoverable = document.recoverableErrors.length;
};

/** Streaming: headers at shell-ready, then chunks; late failures destroy the connection. */
const renderStreamed: RenderMode = async (renderer, request, response, signal, log) => {
  const document = await renderer.renderStream(request, { signal });
  response.writeHead(200, htmlHeaders(document.buildId));
  log.status = 200;
  try {
    for await (const chunk of document.stream) {
      if (signal.aborted) break; // leaving the loop cancels the stream and the render
      if (!response.write(chunk)) await drainOrDestroy(response, WRITE_STALL_TIMEOUT_MS);
    }
  } catch (error) {
    log.error = toWaavyError(error).code;
    abortConnection(response);
    return;
  } finally {
    log.recoverable = document.recoverableErrors().length;
  }
  if (!signal.aborted) response.end();
};

/** Sends the failure as JSON if nothing was sent yet; otherwise cuts the connection. */
function failRequest(response: ServerResponse, error: unknown, log: RequestLog): void {
  const body = toErrorBody(error);
  log.error = body.error.code;
  if (response.headersSent) {
    abortConnection(response);
    return;
  }
  if (response.destroyed) return;
  const status = error instanceof BodyTooLargeError ? 413 : ERROR_CODES[body.error.code].http;
  sendJson(response, status, body);
  log.status = status;
}

function htmlHeaders(buildId: string): Record<string, string> {
  return { 'content-type': 'text/html; charset=utf-8', [HEADERS.buildId]: buildId };
}

function sendJson(response: ServerResponse, status: number, body: unknown, extraHeaders: Record<string, string> = {}): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(Buffer.byteLength(payload)),
    ...extraHeaders
  });
  response.end(payload);
}

/**
 * Unknown routes and assets: `INVALID_REQUEST` with status 404 (the request
 * itself is wrong; `PAGE_NOT_FOUND` is reserved for unregistered page IDs).
 *
 * @returns the HTTP status sent.
 */
function sendNotFound(response: ServerResponse, message: string): number {
  sendJson(response, 404, toErrorBody(new WaavyError('INVALID_REQUEST', message)));
  return 404;
}

/**
 * Serves one file from the client directory. Paths are normalized and must
 * stay inside `assets.dir`.
 *
 * @returns the HTTP status sent.
 */
async function sendAsset(response: ServerResponse, assets: ServedAssets, relativePath: string): Promise<number> {
  const root = normalize(assets.dir + sep);
  const path = normalize(root + decodeURIComponent(relativePath));
  const file = Bun.file(path);
  if (!path.startsWith(root) || !(await file.exists())) {
    return sendNotFound(response, `Asset ${relativePath} not found`);
  }
  response.writeHead(200, { 'content-type': file.type, 'content-length': String(file.size), 'cache-control': 'no-cache' });
  response.end(Buffer.from(await file.arrayBuffer()));
  return 200;
}

/**
 * Ends a response abnormally so the client sees an incomplete body.
 *
 * Destroys the *socket* rather than the response: Bun's
 * `ServerResponse.destroy()` writes a stray `Connection: close` line into an
 * open chunked body (spike P2-S1b), whereas closing the socket leaves a plain
 * truncation that every client reports as an incomplete response.
 */
export function abortConnection(response: ServerResponse): void {
  response.socket?.destroy();
  response.destroy();
}

/**
 * Waits for `drain` (or `close`). A client that stops reading for
 * `timeoutMs` gets its connection destroyed; this also bounds the wait when
 * the client has silently disconnected and no event will ever arrive.
 */
async function drainOrDestroy(response: ServerResponse, timeoutMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      response.off('drain', done);
      response.off('close', done);
      resolve();
    };
    const timer = setTimeout(() => {
      abortConnection(response);
      done();
    }, timeoutMs);
    response.once('drain', done);
    response.once('close', done);
  });
}

function headerValue(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}
