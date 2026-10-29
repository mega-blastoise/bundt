/**
 * Browser-side hydration of a server-rendered waavy page.
 *
 * Generated client entries call {@link hydrate} with the page component and
 * the build ID they were compiled in. `hydrate` reads the props the server
 * rendered with from the data island and hydrates `#waavy-root` with exactly
 * the same element, so server and client trees match.
 *
 * Failures here are reported with `console.error` and never thrown: a page
 * that fails to hydrate still shows its server-rendered HTML.
 */

import { type ComponentType, createElement } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';

import { DATA_ISLAND_ELEMENT_ID, ROOT_ELEMENT_ID } from '../core/constants';
import { type DataIsland, parseDataIsland } from '../core/data-island';

/** Prefix for every message waavy logs in the browser. */
const LOG_PREFIX = '[waavy]';

/** Options passed by the generated client entry. */
export type HydrateOptions = {
  /**
   * The build the client entry belongs to. A mismatch with the island means
   * the HTML and the JavaScript come from different builds — usually a stale
   * CDN or a deploy in progress — and is logged as a warning.
   */
  buildId?: string;
};

/**
 * Hydrates the current document's waavy root with `Page`.
 *
 * @returns the React root, or `undefined` if hydration could not start.
 */
// The page is typed as accepting anything because its props come from JSON
// validated on the server; see `PageComponent` in entry-server.ts.
export function hydrate(Page: ComponentType<never>, options: HydrateOptions = {}): Root | undefined {
  const island = readIsland();
  if (island === undefined) return undefined;

  if (options.buildId !== undefined && options.buildId !== island.buildId) {
    console.warn(
      `${LOG_PREFIX} build mismatch: HTML from ${island.buildId}, script from ${options.buildId}. Hydration may fail.`
    );
  }

  const container = document.getElementById(ROOT_ELEMENT_ID);
  if (container === null) {
    console.error(`${LOG_PREFIX} #${ROOT_ELEMENT_ID} not found; skipping hydration.`);
    return undefined;
  }

  const element = createElement(Page as ComponentType<Record<string, unknown>>, island.props);
  return hydrateRoot(container, element, {
    onRecoverableError: (error) => console.error(`${LOG_PREFIX} recoverable hydration error`, error)
  });
}

/** Reads and parses the data island, logging (not throwing) on failure. */
function readIsland(): DataIsland | undefined {
  const element = document.getElementById(DATA_ISLAND_ELEMENT_ID);
  if (element === null) {
    console.error(`${LOG_PREFIX} #${DATA_ISLAND_ELEMENT_ID} not found; skipping hydration.`);
    return undefined;
  }
  try {
    return parseDataIsland(element.textContent ?? '');
  } catch (error) {
    console.error(`${LOG_PREFIX} invalid data island; skipping hydration.`, error);
    return undefined;
  }
}
