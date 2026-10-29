/**
 * Structured access/server logs for `waavy serve`: one JSON object per line
 * on stderr, so hosts and log shippers can parse them without configuration.
 */

/** How much `waavy serve` logs. */
export const LOG_LEVELS = ['silent', 'error', 'info'] as const;

/** One of {@link LOG_LEVELS}. */
export type LogLevel = (typeof LOG_LEVELS)[number];

/** One completed (or aborted) request. */
export type AccessLogEntry = {
  /** ISO timestamp of completion. */
  ts: string;
  /** Request ID (from `x-request-id`, or generated). */
  id: string;
  method: string;
  path: string;
  /** Page ID for render requests, when the request got far enough to know it. */
  page?: string;
  /** HTTP status sent; `0` if the client went away before headers. */
  status: number;
  /** Wall time in milliseconds. */
  ms: number;
  /** Number of recoverable errors. */
  recoverable?: number;
  stream?: boolean;
  /** Error code for failed requests. */
  error?: string;
  /** `true` if the client disconnected before the response finished. */
  aborted?: boolean;
};

/** A sink for log lines. */
export type Logger = {
  /** Records a completed request (at `info`; failures also at `error`). */
  access: (entry: AccessLogEntry) => void;
  /** Records a server lifecycle event at `info`. */
  event: (event: string, details?: Record<string, unknown>) => void;
};

/** Creates a logger writing JSON lines through `writeLine`. */
export function createLogger(level: LogLevel, writeLine: (line: string) => void): Logger {
  const write = (record: Record<string, unknown>) => writeLine(JSON.stringify(record));
  return {
    access(entry) {
      const failed = entry.error !== undefined || entry.aborted === true;
      if (level === 'info' || (level === 'error' && failed)) write({ type: 'access', ...entry });
    },
    event(event, details = {}) {
      if (level === 'info') write({ type: 'event', ts: new Date().toISOString(), event, ...details });
    }
  };
}
