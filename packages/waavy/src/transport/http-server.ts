/**
 * The `waavy serve` HTTP server: listening, unix socket hygiene, and graceful
 * shutdown. Request semantics live in `http-handler.ts`.
 *
 * Built on `node:http` (which Bun implements natively) rather than
 * `Bun.serve`, because only `node:http` can abort a single in-flight response
 * so clients see an incomplete body (spikes/P2_SPIKES.md, S1).
 */

import { chmod } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';

import { describeError, WaavyError } from '../core/errors';
import type { Logger } from './access-log';
import { createRequestHandler, type ServedRelease } from './http-handler';
import { claimSocketPath, releaseSocketPath } from './unix-socket';

/** Default request body limit: 10 MiB of JSON props. */
export const DEFAULT_MAX_BODY_BYTES = 10 * 1024 * 1024;

/** Default time in-flight requests get to finish during shutdown. */
export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

/** Default permissions for the unix socket: owner read/write only. */
export const DEFAULT_SOCKET_MODE = 0o600;

/** Where to listen. */
export type ListenTarget =
  | { kind: 'socket'; path: string; mode?: number }
  | { kind: 'tcp'; port: number; hostname?: string };

/** Options for {@link startHttpServer}. */
export type HttpServerOptions = {
  listen: ListenTarget;
  /** Returns what to serve; called per request so `--dev` can swap releases. */
  current: () => ServedRelease;
  logger: Logger;
  maxBodyBytes?: number;
  shutdownTimeoutMs?: number;
};

/** A listening server. */
export type RunningHttpServer = {
  /** `unix:/path/to.sock` or `http://host:port`. */
  address: string;
  /** TCP port when listening on TCP (useful with port 0). */
  port: number | undefined;
  /**
   * Stops accepting connections, waits up to the shutdown timeout for
   * in-flight requests, then closes everything and removes the socket file.
   * Idempotent.
   */
  close: () => Promise<void>;
};

/**
 * Starts listening.
 *
 * @throws {WaavyError} `INVALID_REQUEST` if the socket path is taken, or
 *   `INTERNAL` if listening fails.
 */
export async function startHttpServer(options: HttpServerOptions): Promise<RunningHttpServer> {
  const { listen, logger } = options;
  const shutdownTimeoutMs = options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;

  let inFlight = 0;
  const idleWaiters = new Set<() => void>();
  const handle = createRequestHandler({
    current: options.current,
    maxBodyBytes: options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES,
    logger
  });

  const server = createServer((request, response) => {
    inFlight++;
    void handle(request, response).finally(() => {
      inFlight--;
      if (inFlight === 0) for (const notify of idleWaiters) notify();
    });
  });

  if (listen.kind === 'socket') await claimSocketPath(listen.path);
  await listenOn(server, listen);
  if (listen.kind === 'socket') await chmod(listen.path, listen.mode ?? DEFAULT_SOCKET_MODE);

  const port = listen.kind === 'tcp' ? addressPort(server) : undefined;
  const address =
    listen.kind === 'socket' ? `unix:${listen.path}` : `http://${listen.hostname ?? '127.0.0.1'}:${port ?? listen.port}`;
  logger.event('listening', { address, buildId: options.current().renderer.buildId });

  let closing: Promise<void> | undefined;
  const close = () => {
    closing ??= (async () => {
      logger.event('shutting_down', { inFlight });
      server.close();
      server.closeIdleConnections();
      await waitForIdle(() => inFlight, idleWaiters, shutdownTimeoutMs);
      server.closeAllConnections();
      if (listen.kind === 'socket') await releaseSocketPath(listen.path);
      logger.event('stopped');
    })();
    return closing;
  };

  return { address, port, close };
}

function listenOn(server: Server, target: ListenTarget): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) =>
      reject(new WaavyError('INTERNAL', `Cannot listen: ${describeError(error)}`, { cause: error }));
    server.once('error', onError);
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    if (target.kind === 'socket') server.listen(target.path, onListening);
    else server.listen(target.port, target.hostname ?? '127.0.0.1', onListening);
  });
}

function addressPort(server: Server): number | undefined {
  const address = server.address();
  return typeof address === 'object' && address !== null ? address.port : undefined;
}

/** Resolves when `count()` reaches 0 or after `timeoutMs`, whichever is first. */
async function waitForIdle(count: () => number, waiters: Set<() => void>, timeoutMs: number): Promise<void> {
  if (count() === 0) return;
  await new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      waiters.delete(finish);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    waiters.add(finish);
  });
}
