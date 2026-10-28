/**
 * Test support: running `waavy serve` as a child process and talking to it.
 */

import type { Subprocess } from 'bun';

/** A running `waavy serve` process. */
export type ServeProcess = {
  /** Base URL for `fetch` (`http://127.0.0.1:<port>` or `http://localhost` for sockets). */
  baseUrl: string;
  /** Unix socket path, when serving on a socket (pass as `fetch`'s `unix` option). */
  socket: string | undefined;
  /** Every JSON log line received on stderr so far. */
  logs: Array<Record<string, unknown>>;
  process: Subprocess<'ignore', 'ignore', 'pipe'>;
  /** Sends SIGTERM and resolves with the exit code. */
  stop: () => Promise<number>;
};

/** How long to wait for the `listening` event. */
const STARTUP_TIMEOUT_MS = 15_000;

/**
 * Spawns `command serve …args` and resolves once it logs `listening`.
 *
 * @throws if the process exits or logs an error first.
 */
export async function startServe(command: readonly string[], args: readonly string[]): Promise<ServeProcess> {
  // Startup is detected through the `listening` event, which is logged at `info`.
  const level = args[args.indexOf('--log-level') + 1];
  if (args.includes('--log-level') && level !== 'info') {
    throw new Error(`startServe needs --log-level info (got ${level}); quieter levels hide the listening event`);
  }
  const child = Bun.spawn([...command, 'serve', ...args], { stdin: 'ignore', stdout: 'ignore', stderr: 'pipe' });
  const logs: Array<Record<string, unknown>> = [];

  const listening = new Promise<Record<string, unknown>>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`waavy serve did not start: ${JSON.stringify(logs)}`)), STARTUP_TIMEOUT_MS);
    void (async () => {
      let buffered = '';
      const decoder = new TextDecoder();
      for await (const chunk of child.stderr) {
        buffered += decoder.decode(chunk, { stream: true });
        let newline = buffered.indexOf('\n');
        while (newline !== -1) {
          const line = buffered.slice(0, newline);
          buffered = buffered.slice(newline + 1);
          newline = buffered.indexOf('\n');
          if (line.length === 0) continue;
          const record = JSON.parse(line) as Record<string, unknown>;
          logs.push(record);
          if (record['event'] === 'listening') {
            clearTimeout(timer);
            resolve(record);
          }
          if ('error' in record) {
            clearTimeout(timer);
            reject(new Error(`waavy serve failed: ${line}`));
          }
        }
      }
      clearTimeout(timer);
      reject(new Error(`waavy serve exited: ${JSON.stringify(logs)}`));
    })();
  });

  const event = await listening;
  const address = String(event['address']);
  const socket = address.startsWith('unix:') ? address.slice('unix:'.length) : undefined;

  return {
    baseUrl: socket === undefined ? address : 'http://localhost',
    socket,
    logs,
    process: child,
    stop: async () => {
      child.kill('SIGTERM');
      return child.exited;
    }
  };
}

/** `fetch` against a serve process (handles the unix socket option). */
export function serveFetch(server: ServeProcess, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${server.baseUrl}${path}`, { ...init, ...(server.socket === undefined ? {} : { unix: server.socket }) });
}

/** POSTs a render request. */
export function postRender(server: ServeProcess, body: unknown, init: RequestInit = {}): Promise<Response> {
  return serveFetch(server, '/render', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    ...init
  });
}
