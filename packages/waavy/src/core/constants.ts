/**
 * DOM contract between server-rendered documents and the browser hydrator.
 *
 * These IDs are written by `core/document.ts` on the server and read by
 * `browser/hydrate.ts` in the browser. This module must stay dependency-free
 * because it is bundled into every client entry.
 */

/** The element React renders into on the server and hydrates in the browser. */
export const ROOT_ELEMENT_ID = 'waavy-root';

/** The `<script type="application/json">` element holding the data island. */
export const DATA_ISLAND_ELEMENT_ID = 'waavy-data';

/** Version of the data island format. */
export const DATA_ISLAND_VERSION = 1;
