/**
 * The two bundles of a release.
 *
 * - **Client:** one entry per page, code-split so shared code (React, common
 *   components) is downloaded once, with CSS collected per entry.
 * - **Server:** a single self-contained `entry.js` that bundles the
 *   project's React, react-dom/server and every page (ARCHITECTURE.md D8), so
 *   a runtime needs nothing but the release directory.
 *
 * Both builds define `process.env.NODE_ENV` so React's production build is
 * used unless the caller asks for development output.
 */

import { join } from 'node:path';

import { WaavyError } from '../core/errors';
import type { PageAssets } from '../core/manifest';
import { cssStubPlugin, runBunBuild } from './bun-build';
import { pageAssetsFromMetafile } from './client-assets';

/** File name of the server bundle inside the release's server directory. */
export const SERVER_ENTRY_FILE_NAME = 'entry.js';

/** Shared bundle options. */
export type BundleOptions = {
  /** Minify output and use React's production build. */
  production: boolean;
};

/** Defines shared by both bundles. */
function defines(options: BundleOptions): Record<string, string> {
  return { 'process.env.NODE_ENV': JSON.stringify(options.production ? 'production' : 'development') };
}

/** Input for {@link bundleClient}. */
export type ClientBundleInput = BundleOptions & {
  /** Page ID → absolute path of its generated client entry. */
  entries: ReadonlyMap<string, string>;
  /** Directory containing the generated client entries. */
  entriesRoot: string;
  /** Output directory (the release's client directory). */
  outDir: string;
};

/**
 * Bundles every page's client entry.
 *
 * @returns page ID → assets, paths relative to `outDir`.
 * @throws {WaavyError} `BUILD_FAILED`.
 */
export async function bundleClient(input: ClientBundleInput): Promise<Record<string, PageAssets>> {
  const output = await runBunBuild(
    {
      entrypoints: [...input.entries.values()],
      root: input.entriesRoot,
      outdir: input.outDir,
      target: 'browser',
      format: 'esm',
      splitting: true,
      minify: input.production,
      sourcemap: 'linked',
      metafile: true,
      define: defines(input),
      naming: {
        entry: '[dir]/[name]-[hash].[ext]',
        chunk: 'chunks/chunk-[hash].[ext]',
        asset: 'assets/[name]-[hash].[ext]'
      }
    },
    'Client bundle'
  );
  if (output.metafile === undefined) {
    throw new WaavyError('INTERNAL', 'Bun.build did not return a metafile although metafile: true was set');
  }
  return pageAssetsFromMetafile(output.metafile, input.entries, process.cwd());
}

/** Input for {@link bundleServer}. */
export type ServerBundleInput = BundleOptions & {
  /** Absolute path of the generated server entry. */
  entry: string;
  /** Output directory (the release's server directory). */
  outDir: string;
};

/**
 * Bundles the server entry with all dependencies inlined.
 *
 * @returns absolute path of the written bundle.
 * @throws {WaavyError} `BUILD_FAILED`.
 */
export async function bundleServer(input: ServerBundleInput): Promise<string> {
  await runBunBuild(
    {
      entrypoints: [input.entry],
      outdir: input.outDir,
      target: 'bun',
      format: 'esm',
      splitting: false,
      minify: input.production,
      sourcemap: 'linked',
      packages: 'bundle',
      plugins: [cssStubPlugin],
      define: defines(input),
      naming: SERVER_ENTRY_FILE_NAME
    },
    'Server bundle'
  );
  return join(input.outDir, SERVER_ENTRY_FILE_NAME);
}
