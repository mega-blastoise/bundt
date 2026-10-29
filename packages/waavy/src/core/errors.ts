/**
 * The waavy error model.
 *
 * Every failure that crosses a waavy boundary (library call, CLI exit, HTTP
 * response) is a {@link WaavyError} carrying one {@link ErrorCode}. Library
 * code only ever *throws*; mapping a code to a process exit status or an HTTP
 * status is the job of the transport layer, using the table below.
 *
 * See ARCHITECTURE.md §5.4.
 */

/** How a single error code is surfaced by each transport. */
type ErrorCodeSpec = {
  /** Process exit status used by the one-shot CLI. */
  readonly exit: number;
  /** HTTP status used by `waavy serve`. */
  readonly http: number;
};

/**
 * The complete, stable set of error codes. Codes are part of the public host
 * protocol: renaming or renumbering one is a breaking change.
 */
export const ERROR_CODES = {
  /** The render request (or CLI flags that build it) failed validation. */
  INVALID_REQUEST: { exit: 10, http: 400 },
  /** The requested page ID is not registered in the release. */
  PAGE_NOT_FOUND: { exit: 11, http: 404 },
  /** React failed to render the page shell; no usable HTML exists. */
  RENDER_FAILED: { exit: 20, http: 500 },
  /** The render deadline passed before the page shell was ready. */
  RENDER_TIMEOUT: { exit: 21, http: 504 },
  /** The release directory is missing files or is internally inconsistent. */
  RELEASE_INVALID: { exit: 30, http: 503 },
  /** The release was built for an incompatible manifest/ABI/protocol version. */
  VERSION_MISMATCH: { exit: 31, http: 503 },
  /** `waavy build` could not bundle the project. */
  BUILD_FAILED: { exit: 40, http: 500 },
  /** `waavy.config.*` is missing or invalid. */
  CONFIG_INVALID: { exit: 41, http: 500 },
  /** Anything unexpected. Always a bug in waavy or an unclassified failure. */
  INTERNAL: { exit: 70, http: 500 }
} as const satisfies Record<string, ErrorCodeSpec>;

/** One of the stable error code names, e.g. `'PAGE_NOT_FOUND'`. */
export type ErrorCode = keyof typeof ERROR_CODES;

/** All error code names, in declaration order. Useful for schemas. */
export const ERROR_CODE_NAMES = Object.keys(ERROR_CODES) as [ErrorCode, ...ErrorCode[]];

/** Extra context attached to a {@link WaavyError}. */
export type WaavyErrorOptions = {
  /** The page ID the failure relates to, when there is one. */
  page?: string;
  /** The underlying error, preserved for logs and debugging. */
  cause?: unknown;
};

/** The single error class used throughout waavy. */
export class WaavyError extends Error {
  override readonly name = 'WaavyError';

  /** Stable machine-readable classification of the failure. */
  readonly code: ErrorCode;

  /** The page ID the failure relates to, when there is one. */
  readonly page: string | undefined;

  constructor(code: ErrorCode, message: string, options: WaavyErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.code = code;
    this.page = options.page;
  }
}

/**
 * The JSON body waavy emits for a failure, on stderr (one-shot) or as an HTTP
 * response body (serve). `page` is omitted when unknown.
 */
export type ErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    page?: string;
  };
};

/** Type guard for {@link WaavyError}. */
export function isWaavyError(value: unknown): value is WaavyError {
  return value instanceof WaavyError;
}

/**
 * Extracts a human-readable message from any thrown value without ever
 * throwing itself. Used wherever an unknown error must be reported.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error) ?? String(error);
  } catch {
    return String(error);
  }
}

/**
 * Normalizes any thrown value into a {@link WaavyError}. Values that are
 * already waavy errors pass through untouched; everything else becomes
 * `INTERNAL` with the original value kept as `cause`.
 */
export function toWaavyError(error: unknown): WaavyError {
  if (isWaavyError(error)) return error;
  return new WaavyError('INTERNAL', describeError(error), { cause: error });
}

/**
 * Builds the wire representation of a failure. Stack traces and causes are
 * deliberately not included: they are for logs, not for host applications.
 */
export function toErrorBody(error: unknown): ErrorBody {
  const waavyError = toWaavyError(error);
  return {
    error: {
      code: waavyError.code,
      message: waavyError.message,
      ...(waavyError.page === undefined ? {} : { page: waavyError.page })
    }
  };
}
