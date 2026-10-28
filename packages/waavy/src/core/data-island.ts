/**
 * The data island: how page props travel from the server to the browser.
 *
 * The server embeds a non-executable `<script type="application/json">`
 * element containing {@link DataIsland}. Because it is JSON rather than
 * JavaScript, a malformed value can never become a syntax error, and because
 * the characters that could terminate the element or confuse an HTML parser
 * are written as JSON unicode escapes, props cannot inject markup.
 *
 * This module is bundled into the browser: it must not import Zod or any
 * server-only code.
 *
 * See ARCHITECTURE.md §4.4.
 */

import { DATA_ISLAND_VERSION } from './constants';

/** The payload of the data island. */
export type DataIsland = {
  /** Island format version, always {@link DATA_ISLAND_VERSION}. */
  v: typeof DATA_ISLAND_VERSION;
  /** Page ID that was rendered. */
  page: string;
  /** Build that produced the server HTML; compared against the client entry's build. */
  buildId: string;
  /** Props the page was rendered with. */
  props: Record<string, unknown>;
};

/**
 * Characters rewritten as literal JSON escapes (`<` etc.):
 * - `<` and `>` so the text can never form `</script>` or `<!--`;
 * - `&` so the text has no character references;
 * - U+2028 / U+2029 because some JavaScript parsers treat them as line breaks.
 * `JSON.parse` turns every escape back into the original character.
 */
const ISLAND_ESCAPES: Readonly<Record<string, string>> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029'
};

/** Serializes an island into text that is safe inside a `<script>` element. */
export function serializeDataIsland(island: DataIsland): string {
  return JSON.stringify(island).replace(/[<>&\u2028\u2029]/g, (character) => {
    return ISLAND_ESCAPES[character] ?? character;
  });
}

/**
 * Parses island text read from the DOM.
 *
 * @throws {Error} if the text is not JSON or not a version-1 island. The
 *   browser hydrator reports this and skips hydration.
 */
export function parseDataIsland(text: string): DataIsland {
  const value: unknown = JSON.parse(text);
  if (!isRecord(value)) throw new Error('data island is not a JSON object');
  if (value['v'] !== DATA_ISLAND_VERSION) {
    throw new Error(`unsupported data island version ${String(value['v'])}`);
  }
  const { page, buildId, props } = value;
  if (typeof page !== 'string' || typeof buildId !== 'string' || !isRecord(props)) {
    throw new Error('data island is missing "page", "buildId" or "props"');
  }
  return { v: DATA_ISLAND_VERSION, page, buildId, props };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
