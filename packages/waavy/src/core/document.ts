/**
 * The document shell waavy wraps around every rendered page.
 *
 * React renders *only* the page component; this module produces the markup
 * before it (`prefix`: doctype, head, opening root container) and after it
 * (`suffix`: closing container, data island, client entry script). Keeping the
 * shell outside React means the browser hydrates exactly the tree the server
 * rendered — `#waavy-root` and nothing else.
 *
 * See ARCHITECTURE.md §4.3.
 */

import { DATA_ISLAND_ELEMENT_ID, ROOT_ELEMENT_ID } from './constants';
import { escapeHtml } from './html';
import type { DocumentOptions } from './protocol';

/** Language used for `<html lang>` when the request does not specify one. */
export const DEFAULT_DOCUMENT_LANG = 'en';

/** Fully-qualified asset URLs for one page, resolved from the release manifest. */
export type DocumentAssets = {
  /** Module scripts to execute (the page's client entry). */
  scripts: readonly string[];
  /** Stylesheets to link. */
  styles: readonly string[];
  /** Static chunks to `modulepreload`. */
  preloads: readonly string[];
};

/** Everything needed to build a document shell. */
export type DocumentShellInput = {
  /** Host-supplied document options from the render request. */
  document: DocumentOptions | undefined;
  /** Asset URLs for the page. */
  assets: DocumentAssets;
  /** Serialized data island (see `serializeDataIsland`). */
  island: string;
};

/** Markup that goes before and after the rendered component. */
export type DocumentShell = {
  prefix: string;
  suffix: string;
};

/** Builds the markup surrounding a rendered page. */
export function createDocumentShell(input: DocumentShellInput): DocumentShell {
  const { document, assets, island } = input;
  const lang = document?.lang ?? DEFAULT_DOCUMENT_LANG;

  const head = [
    '<meta charset="utf-8">',
    document?.title === undefined ? '' : `<title>${escapeHtml(document.title)}</title>`,
    document?.head ?? '',
    ...assets.styles.map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`),
    ...assets.preloads.map((href) => `<link rel="modulepreload" href="${escapeHtml(href)}">`)
  ].join('');

  const prefix = `<!doctype html><html lang="${escapeHtml(lang)}"><head>${head}</head><body><div id="${ROOT_ELEMENT_ID}">`;

  const suffix = [
    '</div>',
    `<script type="application/json" id="${DATA_ISLAND_ELEMENT_ID}">${island}</script>`,
    ...assets.scripts.map((src) => `<script type="module" src="${escapeHtml(src)}"></script>`),
    '</body></html>'
  ].join('');

  return { prefix, suffix };
}
