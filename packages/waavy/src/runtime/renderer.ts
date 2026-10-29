/**
 * The renderer: turns render requests into complete HTML documents using a
 * validated release. Every transport (one-shot CLI, HTTP, in-process) goes
 * through {@link createRenderer}, so request handling is identical
 * everywhere.
 */

import { DATA_ISLAND_VERSION } from '../core/constants';
import { serializeDataIsland } from '../core/data-island';
import { createDocumentShell, type DocumentShell } from '../core/document';
import { WaavyError } from '../core/errors';
import { parseRenderRequest } from '../core/protocol';
import { type RecoverableError, renderBuffered, renderStreaming } from '../core/render';
import { wrapStream } from '../core/streams';
import { resolveDocumentAssets } from './assets';
import { type OpenedRelease, openRelease } from './release';

/** Options for {@link createRenderer}. */
export type RendererOptions = {
  /** Path to a release directory produced by `waavy build`. */
  release: string;
};

/** Per-call options that are not part of the wire request. */
export type RenderCallOptions = {
  /** Aborts the render, e.g. when the HTTP client disconnects. */
  signal?: AbortSignal;
};

/** A fully rendered document. */
export type RenderedDocument = {
  html: string;
  buildId: string;
  recoverableErrors: readonly RecoverableError[];
};

/** A document being streamed; resolved once the page shell is ready. */
export type StreamedDocument = {
  /**
   * The document bytes. If rendering fails after the shell, the stream errors
   * and the closing markup is never written.
   */
  stream: ReadableStream<Uint8Array>;
  buildId: string;
  /** Recoverable errors so far; final once `stream` has been fully read. */
  recoverableErrors: () => readonly RecoverableError[];
};

/** Renders pages from one release. */
export type Renderer = {
  /** Build ID of the loaded release. */
  readonly buildId: string;
  /** Page IDs available in the release. */
  readonly pages: readonly string[];
  /**
   * Renders a complete document, waiting for every Suspense boundary.
   * The request's `stream` flag is ignored.
   *
   * @throws {WaavyError} `INVALID_REQUEST`, `PAGE_NOT_FOUND`, `RENDER_FAILED`, `RENDER_TIMEOUT`.
   */
  render: (request: unknown, options?: RenderCallOptions) => Promise<RenderedDocument>;
  /**
   * Streams a document once its shell is ready. The request's `stream` flag
   * is ignored.
   *
   * @throws {WaavyError} same codes as {@link Renderer.render}, for shell failures.
   */
  renderStream: (request: unknown, options?: RenderCallOptions) => Promise<StreamedDocument>;
  /** Releases resources. Currently a no-op, kept so callers need not change later. */
  close: () => Promise<void>;
};

/**
 * Opens and validates a release, returning a renderer for it.
 *
 * @throws {WaavyError} `RELEASE_INVALID` or `VERSION_MISMATCH`.
 */
export async function createRenderer(options: RendererOptions): Promise<Renderer> {
  const release = await openRelease(options.release);
  const { manifest, entry } = release;

  return {
    buildId: manifest.buildId,
    pages: entry.pages,

    async render(input, callOptions = {}) {
      const prepared = prepareRender(release, input);
      const result = await renderBuffered(entry.renderToReadableStream, prepared.pageId, prepared.props, {
        timeoutMs: prepared.timeoutMs,
        signal: callOptions.signal
      });
      return {
        html: prepared.shell.prefix + result.body + prepared.shell.suffix,
        buildId: manifest.buildId,
        recoverableErrors: result.recoverableErrors
      };
    },

    async renderStream(input, callOptions = {}) {
      const prepared = prepareRender(release, input);
      const result = await renderStreaming(entry.renderToReadableStream, prepared.pageId, prepared.props, {
        timeoutMs: prepared.timeoutMs,
        signal: callOptions.signal
      });
      return {
        stream: wrapStream(prepared.shell.prefix, result.body, prepared.shell.suffix),
        buildId: manifest.buildId,
        recoverableErrors: result.recoverableErrors
      };
    },

    async close() {}
  };
}

/** Everything a render needs, derived from a validated request. */
type PreparedRender = {
  pageId: string;
  props: Record<string, unknown>;
  timeoutMs: number;
  shell: DocumentShell;
};

/**
 * Validates the request, checks the page exists, and builds the document
 * shell. Shared by both render modes.
 */
function prepareRender(release: OpenedRelease, input: unknown): PreparedRender {
  const request = parseRenderRequest(input);
  const { manifest } = release;

  if (manifest.pages[request.page] === undefined) {
    throw new WaavyError('PAGE_NOT_FOUND', `Page "${request.page}" is not registered in release ${manifest.buildId}`, {
      page: request.page
    });
  }

  const island = serializeDataIsland({
    v: DATA_ISLAND_VERSION,
    page: request.page,
    buildId: manifest.buildId,
    props: request.props
  });
  return {
    pageId: request.page,
    props: request.props,
    timeoutMs: request.timeoutMs ?? manifest.renderDefaults.timeoutMs,
    shell: createDocumentShell({
      document: request.document,
      assets: resolveDocumentAssets(manifest, request.page),
      island
    })
  };
}
