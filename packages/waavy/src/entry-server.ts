/**
 * `@bundt/waavy/entry-server` — imported only by the server entry that
 * `waavy build` generates; not a user-facing API.
 *
 * The generated `server/entry.js` registers the project's page components
 * with {@link defineRelease}. Because the release is bundled with the
 * project's own React, this module is where React actually renders on the
 * server. Everything else about rendering (deadlines, error classification,
 * the document shell) happens in the waavy runtime, on the other side of the
 * release ABI (`core/release-abi.ts`).
 */

import { type ComponentType, createElement } from 'react';
import { renderToReadableStream } from 'react-dom/server';

import { RELEASE_ABI_VERSION, type ReleaseEntry } from './core/release-abi';
import { WAAVY_VERSION } from './core/version';

/**
 * A page component. Pages take JSON props whose exact shape only the page
 * knows, so components with any props type are accepted.
 */
// `never` is the props type every component is assignable to; props are
// supplied as validated JSON at render time.
export type PageComponent = ComponentType<never>;

/** What the generated server entry passes to {@link defineRelease}. */
export type ReleaseDefinition = {
  /** Build identifier shared with the manifest and client entries. */
  buildId: string;
  /** Page ID → page component. */
  pages: Readonly<Record<string, PageComponent>>;
};

export type { ReleaseEntry } from './core/release-abi';

/** Builds the `release` object exported by `server/entry.js`. */
export function defineRelease(definition: ReleaseDefinition): ReleaseEntry {
  const { buildId, pages } = definition;

  return {
    abi: RELEASE_ABI_VERSION,
    waavyVersion: WAAVY_VERSION,
    buildId,
    pages: Object.freeze(Object.keys(pages)),
    renderToReadableStream(pageId, props, options) {
      const Page = pages[pageId];
      if (Page === undefined) {
        // The runtime validates page IDs before calling; reaching this means
        // the manifest and entry disagree. Plain Error on purpose: classes do
        // not survive the release boundary (see release-abi.ts).
        return Promise.reject(new Error(`Release ${buildId} has no page "${pageId}"`));
      }
      // The only place props meet a component; see PageComponent.
      const element = createElement(Page as ComponentType<Record<string, unknown>>, props);
      return renderToReadableStream(element, {
        signal: options.signal,
        // React treats a string returned from onError as the error's digest.
        // Discard whatever the runtime's callback returns so that never happens
        // by accident.
        onError: (error) => {
          options.onError(error);
        }
      });
    }
  };
}
