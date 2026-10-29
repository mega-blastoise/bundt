/**
 * Unix socket hygiene for `waavy serve --socket`.
 *
 * A socket file left behind by a crashed process blocks `listen()`. Before
 * listening, waavy checks whether the path is answered by a live server: if
 * so it refuses to start (two renderers must not share one path); if not,
 * the stale file is removed.
 */

import { lstat, unlink } from 'node:fs/promises';
import { request } from 'node:http';

import { WaavyError } from '../core/errors';

/** How long to wait for a live server to answer the probe. */
const PROBE_TIMEOUT_MS = 500;

/**
 * Makes `path` available for `listen()`.
 *
 * @throws {WaavyError} `INVALID_REQUEST` if the path is in use by a live
 *   server or exists and is not a socket.
 */
export async function claimSocketPath(path: string): Promise<void> {
  const stats = await lstat(path).catch(() => undefined);
  if (stats === undefined) return;
  if (!stats.isSocket()) {
    throw new WaavyError('INVALID_REQUEST', `${path} exists and is not a socket; refusing to replace it`);
  }
  if (await isSocketLive(path)) {
    throw new WaavyError('INVALID_REQUEST', `Another server is already listening on ${path}`);
  }
  await unlink(path);
}

/** Removes the socket file, ignoring a missing file. */
export async function releaseSocketPath(path: string): Promise<void> {
  await unlink(path).catch(() => undefined);
}

/** Resolves `true` if something accepts an HTTP request on the socket. */
function isSocketLive(path: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = request({ socketPath: path, path: '/health', method: 'GET', timeout: PROBE_TIMEOUT_MS }, (response) => {
      response.resume();
      resolve(true);
    });
    probe.on('timeout', () => {
      probe.destroy();
      resolve(false);
    });
    probe.on('error', () => resolve(false));
    probe.end();
  });
}
