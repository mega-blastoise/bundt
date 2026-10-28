/**
 * Turns manifest asset paths into the URLs written into documents.
 */

import type { DocumentAssets } from '../core/document';
import type { Manifest } from '../core/manifest';

/**
 * Resolves the asset URLs for `pageId`. Manifest paths are relative to the
 * client directory, which the host serves at `publicPath`, so a URL is simply
 * `publicPath + path`.
 */
export function resolveDocumentAssets(manifest: Manifest, pageId: string): DocumentAssets {
  const assets = manifest.pages[pageId];
  if (assets === undefined) return { scripts: [], styles: [], preloads: [] };
  const toUrl = (path: string) => `${manifest.publicPath}${path}`;
  return {
    scripts: [toUrl(assets.client)],
    styles: assets.css.map(toUrl),
    preloads: assets.preload.map(toUrl)
  };
}
