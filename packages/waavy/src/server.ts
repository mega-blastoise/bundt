/**
 * `@bundt/waavy/server` — in-process rendering for JavaScript hosts running
 * on Bun.
 *
 * ```ts
 * import { createRenderer } from '@bundt/waavy/server';
 *
 * const renderer = await createRenderer({ release: './dist/waavy' });
 * const { html } = await renderer.render({ v: 1, page: 'home', props: { name: 'Ada' } });
 * ```
 *
 * Non-JavaScript hosts use the `waavy` binary instead (one-shot or `serve`).
 */

export { isWaavyError, WaavyError } from './core/errors';
export type { RecoverableError } from './core/render';
export {
  createRenderer,
  type RenderCallOptions,
  type RenderedDocument,
  type Renderer,
  type RendererOptions,
  type StreamedDocument
} from './runtime/renderer';
