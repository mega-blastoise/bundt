/**
 * The release ABI: the only interface between the waavy runtime (CLI,
 * binary, `createRenderer`) and a built release's `server/entry.js`.
 *
 * A release bundles its own copy of React, react-dom/server, and the page
 * components. The runtime never imports React itself; it calls
 * {@link ReleaseEntry.renderToReadableStream} and handles timeouts, error
 * classification, and the document shell on its side. Keeping the ABI this
 * small lets a binary run releases built with a different (ABI-compatible)
 * waavy version.
 *
 * Because the release carries its *own* copy of waavy's code, values that
 * cross this boundary must be plain data and functions: never rely on
 * `instanceof` against classes defined in the runtime.
 */

/** Version of the ABI. Bumped only for breaking changes to {@link ReleaseEntry}. */
export const RELEASE_ABI_VERSION = 1;

/** Name of the export `server/entry.js` must provide. */
export const RELEASE_EXPORT_NAME = 'release';

/**
 * React's server stream: a byte stream plus `allReady`, which settles once
 * every Suspense boundary has resolved (or the render was aborted or failed).
 */
export type ReactRenderStream = ReadableStream<Uint8Array> & { allReady: Promise<void> };

/** Options the runtime passes for every render. */
export type ReleaseRenderOptions = {
  /** Aborting this signal makes React stop waiting and flush fallbacks. */
  signal: AbortSignal;
  /** Called by React for every error it encounters while rendering. */
  onError: (error: unknown) => void;
};

/**
 * Starts rendering a page. Resolves once the shell is ready; rejects if the
 * shell cannot be rendered.
 */
export type RenderToReadableStream = (
  pageId: string,
  props: Record<string, unknown>,
  options: ReleaseRenderOptions
) => Promise<ReactRenderStream>;

/** The object exported as `release` from `server/entry.js`. */
export type ReleaseEntry = {
  /** ABI version the entry implements. */
  abi: number;
  /** Version of `@bundt/waavy` that produced the release. */
  waavyVersion: string;
  /** Build identifier, identical to the manifest's. */
  buildId: string;
  /** Page IDs the entry can render. */
  pages: readonly string[];
  /** Renders a page; see {@link RenderToReadableStream}. */
  renderToReadableStream: RenderToReadableStream;
};

/**
 * Structural check for a {@link ReleaseEntry}. Version compatibility is
 * checked separately by the runtime so it can report `VERSION_MISMATCH`.
 */
export function isReleaseEntry(value: unknown): value is ReleaseEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry['abi'] === 'number' &&
    typeof entry['waavyVersion'] === 'string' &&
    typeof entry['buildId'] === 'string' &&
    Array.isArray(entry['pages']) &&
    entry['pages'].every((page) => typeof page === 'string') &&
    typeof entry['renderToReadableStream'] === 'function'
  );
}
