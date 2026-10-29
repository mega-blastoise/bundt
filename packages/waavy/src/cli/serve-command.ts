/**
 * `waavy serve`: the warm renderer over HTTP (unix socket or TCP).
 *
 * All output is JSON lines on stderr — startup failures use the same
 * `{"error":…}` contract as `waavy render`, so supervisors can parse them —
 * and the process exits 0 after a graceful SIGTERM/SIGINT shutdown.
 */

import { WaavyError } from '../core/errors';
import { createRenderer } from '../runtime/renderer';
import { createLogger, LOG_LEVELS, type LogLevel } from '../transport/access-log';
import type { ServedRelease } from '../transport/http-handler';
import { type ListenTarget, startHttpServer } from '../transport/http-server';
import type { CommandIO } from '../transport/io';
import { EXIT_SUCCESS, reportFailure } from '../transport/oneshot';
import { startDevReleases } from './dev-releases';

/** Raw `waavy serve` options as parsed by cac. */
export type ServeFlags = {
  release?: unknown;
  socket?: unknown;
  socketMode?: unknown;
  port?: unknown;
  hostname?: unknown;
  maxBody?: unknown;
  logLevel?: unknown;
  shutdownTimeout?: unknown;
  dev?: unknown;
  root?: unknown;
  config?: unknown;
};

/** Resolves with the signal name once the process is asked to stop. */
export type ShutdownSignal = () => Promise<string>;

/**
 * Waits for SIGTERM or SIGINT.
 *
 * The handlers stay installed after the first signal so that repeats are
 * ignored instead of killing the process mid-drain: a terminal Ctrl-C
 * reaches both the npm launcher and this binary, and the launcher forwards
 * its copy too. The drain is bounded by `--shutdown-timeout` regardless.
 */
export const processShutdownSignal: ShutdownSignal = () =>
  new Promise((resolve) => {
    const onSignal = (signal: string) => resolve(signal);
    process.on('SIGTERM', onSignal);
    process.on('SIGINT', onSignal);
  });

/** Runs the server until a shutdown signal; returns the exit code. */
export async function serveCommand(
  flags: ServeFlags,
  io: CommandIO,
  shutdownSignal: ShutdownSignal = processShutdownSignal
): Promise<number> {
  // Listen for signals before the server announces `listening`: a
  // supervisor may stop the process the moment it sees that event.
  const stopRequested = shutdownSignal();
  let stop: (() => Promise<void>) | undefined;
  try {
    const listen = listenTargetFromFlags(flags);
    const logger = createLogger(logLevelFromFlags(flags), io.writeStderrLine);
    const source = await releaseSourceFromFlags(flags, logger);
    const server = await startHttpServer({
      listen,
      current: source.current,
      logger,
      ...optionalInteger('maxBodyBytes', '--max-body', flags.maxBody),
      ...optionalInteger('shutdownTimeoutMs', '--shutdown-timeout', flags.shutdownTimeout)
    });
    stop = async () => {
      await server.close();
      await source.close();
    };
  } catch (error) {
    return reportFailure(io, error);
  }

  await stopRequested;
  await stop();
  return EXIT_SUCCESS;
}

type ReleaseSource = { current: () => ServedRelease; close: () => Promise<void> };

async function releaseSourceFromFlags(
  flags: ServeFlags,
  logger: ReturnType<typeof createLogger>
): Promise<ReleaseSource> {
  if (flags.dev === true) {
    if (flags.release !== undefined) throw invalid('--dev builds from source; do not pass --release');
    return startDevReleases({
      root: typeof flags.root === 'string' ? flags.root : process.cwd(),
      ...(typeof flags.config === 'string' ? { configPath: flags.config } : {}),
      logger
    });
  }
  if (typeof flags.release !== 'string') throw invalid('--release <dir> is required (or use --dev)');
  const renderer = await createRenderer({ release: flags.release });
  return { current: () => ({ renderer }), close: () => renderer.close() };
}

/** Exactly one of `--socket` / `--port`. */
function listenTargetFromFlags(flags: ServeFlags): ListenTarget {
  const hasSocket = flags.socket !== undefined;
  const hasPort = flags.port !== undefined;
  if (hasSocket === hasPort) throw invalid('pass exactly one of --socket <path> or --port <n>');

  if (hasSocket) {
    if (process.platform === 'win32') throw invalid('--socket is not supported on Windows; use --port');
    const mode = flags.socketMode === undefined ? undefined : Number.parseInt(String(flags.socketMode), 8);
    if (mode !== undefined && (!Number.isInteger(mode) || mode < 0 || mode > 0o777)) {
      throw invalid('--socket-mode must be an octal permission such as 600');
    }
    return { kind: 'socket', path: String(flags.socket), ...(mode === undefined ? {} : { mode }) };
  }

  const port = Number(flags.port);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) throw invalid('--port must be an integer 0–65535');
  return { kind: 'tcp', port, ...(typeof flags.hostname === 'string' ? { hostname: flags.hostname } : {}) };
}

function logLevelFromFlags(flags: ServeFlags): LogLevel {
  const level = flags.logLevel ?? 'info';
  if (!LOG_LEVELS.includes(level as LogLevel)) throw invalid(`--log-level must be one of ${LOG_LEVELS.join(', ')}`);
  return level as LogLevel;
}

/** `{ [key]: n }` for a positive integer flag, `{}` when absent. */
function optionalInteger<K extends string>(key: K, flag: string, value: unknown): Partial<Record<K, number>> {
  if (value === undefined) return {};
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw invalid(`${flag} must be a positive integer`);
  return { [key]: number } as Partial<Record<K, number>>;
}

function invalid(message: string): WaavyError {
  return new WaavyError('INVALID_REQUEST', message);
}
