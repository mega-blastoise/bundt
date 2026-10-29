/**
 * Translating `waavy render` flags into a render request.
 *
 * Two mutually exclusive input styles are supported:
 * - flags: `--page`, `--props`/`--props-file`, `--title`, `--lang`, `--head`,
 *   `--stream`, `--timeout`;
 * - `--stdin`: a complete JSON `RenderRequest` on stdin (best for programmatic
 *   callers and large props, which may exceed argv limits).
 *
 * This module only assembles the request; the protocol schema validates it.
 */

import { readFile } from 'node:fs/promises';

import { describeError, WaavyError } from '../core/errors';
import { PROTOCOL_VERSION } from '../core/protocol';

/** Raw `waavy render` options as parsed by cac (values are untyped). */
export type RenderFlags = {
  release?: unknown;
  page?: unknown;
  props?: unknown;
  propsFile?: unknown;
  stdin?: unknown;
  title?: unknown;
  lang?: unknown;
  head?: unknown;
  stream?: unknown;
  timeout?: unknown;
};

/** The release to use and the (not yet validated) request. */
export type RenderInvocation = {
  release: string;
  request: unknown;
};

/** Flags that describe the request and therefore conflict with `--stdin`. */
const REQUEST_FLAGS = ['page', 'props', 'propsFile', 'title', 'lang', 'head', 'stream', 'timeout'] as const;

/**
 * Builds the render invocation from flags.
 *
 * @param readStdin - reads all of stdin; only called with `--stdin`.
 * @throws {WaavyError} `INVALID_REQUEST` for missing/conflicting flags or invalid JSON.
 */
export async function renderInvocationFromFlags(
  flags: RenderFlags,
  readStdin: () => Promise<string>
): Promise<RenderInvocation> {
  const release = optionalString(flags.release);
  if (release === undefined) throw invalid('--release <dir> is required');

  if (flags.stdin === true) {
    const conflicting = REQUEST_FLAGS.filter((name) => flags[name] !== undefined);
    if (conflicting.length > 0) {
      throw invalid(`--stdin cannot be combined with ${conflicting.map(toFlagName).join(', ')}`);
    }
    return { release, request: parseJson(await readStdin(), 'stdin') };
  }

  const page = optionalString(flags.page);
  if (page === undefined) throw invalid('--page <id> is required (or pass a full request with --stdin)');

  return {
    release,
    request: {
      v: PROTOCOL_VERSION,
      page,
      props: await readProps(flags),
      ...documentFromFlags(flags),
      ...(flags.stream === true ? { stream: true } : {}),
      ...(flags.timeout === undefined ? {} : { timeoutMs: Number(flags.timeout) })
    }
  };
}

/** Reads props from `--props` or `--props-file` (at most one), defaulting to `{}`. */
async function readProps(flags: RenderFlags): Promise<unknown> {
  const inline = optionalString(flags.props);
  const file = optionalString(flags.propsFile);
  if (inline !== undefined && file !== undefined) throw invalid('use either --props or --props-file, not both');
  if (inline !== undefined) return parseJson(inline, '--props');
  if (file === undefined) return {};
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    throw invalid(`cannot read --props-file ${file}: ${describeError(error)}`);
  }
  return parseJson(text, `--props-file ${file}`);
}

/** Collects document options; omitted entirely when no flag was given. */
function documentFromFlags(flags: RenderFlags): { document?: Record<string, string> } {
  const document: Record<string, string> = {};
  for (const key of ['title', 'lang', 'head'] as const) {
    const value = optionalString(flags[key]);
    if (value !== undefined) document[key] = value;
  }
  return Object.keys(document).length === 0 ? {} : { document };
}

function parseJson(text: string, source: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw invalid(`${source} is not valid JSON: ${describeError(error)}`);
  }
}

/**
 * cac converts numeric-looking values to numbers (e.g. `--title 2024`); text
 * flags are always strings for waavy, so convert back. `true` (a flag given
 * without a value) is treated as missing.
 */
function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || typeof value === 'boolean') return undefined;
  return String(value);
}

function toFlagName(name: string): string {
  return `--${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

function invalid(message: string): WaavyError {
  return new WaavyError('INVALID_REQUEST', message);
}
