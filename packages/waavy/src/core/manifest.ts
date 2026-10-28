/**
 * The release manifest (`<release>/manifest.json`).
 *
 * The manifest is the deployment contract between `waavy build` and every
 * runtime: it names the server entry, the client assets of each page, and
 * the versions the release was built against. Production renders consult
 * nothing outside the release directory.
 *
 * Path conventions:
 * - `server` is relative to the release root (e.g. `"server/entry.js"`).
 * - page asset paths are relative to {@link RELEASE_CLIENT_DIR}, i.e. relative
 *   to the directory the host serves at `publicPath`.
 *
 * See ARCHITECTURE.md §4.2.
 */

import { z } from 'zod';

import { PageIdSchema } from './page-id';
import { MAX_TIMEOUT_MS } from './protocol';
import { parseWithSchema } from './validation';

/** Version of the manifest format. */
export const MANIFEST_VERSION = 1;

/** File name of the manifest inside a release. */
export const MANIFEST_FILE_NAME = 'manifest.json';

/** Directory (inside a release) holding browser assets served at `publicPath`. */
export const RELEASE_CLIENT_DIR = 'client';

/** Directory (inside a release) holding the server bundle. */
export const RELEASE_SERVER_DIR = 'server';

/**
 * A forward-slash path that stays inside its base directory: not absolute,
 * no `..` segments, no backslashes. Guards the runtime against a tampered
 * manifest pointing outside the release.
 */
const ContainedPathSchema = z
  .string()
  .min(1)
  .refine(
    (value) => !value.startsWith('/') && !value.includes('\\') && !value.split('/').includes('..'),
    'must be a relative path inside the release'
  );

/** Client assets for one page. */
export const PageAssetsSchema = z.strictObject({
  /** The page's client entry module. */
  client: ContainedPathSchema,
  /** Stylesheets imported (directly or transitively) by the page. */
  css: z.array(ContainedPathSchema),
  /** Static chunks the client entry imports, for `modulepreload`. */
  preload: z.array(ContainedPathSchema)
});

/** Full manifest schema. Versions are plain integers so mismatches can be reported precisely. */
export const ManifestSchema = z.strictObject({
  manifestVersion: z.number().int(),
  abi: z.number().int(),
  protocolVersion: z.number().int(),
  waavyVersion: z.string().min(1),
  buildId: z.string().min(1),
  publicPath: z.string().min(1),
  renderDefaults: z.strictObject({
    timeoutMs: z.number().int().min(1).max(MAX_TIMEOUT_MS)
  }),
  server: ContainedPathSchema,
  pages: z.record(PageIdSchema, PageAssetsSchema)
});

/** A validated release manifest. */
export type Manifest = z.output<typeof ManifestSchema>;

/** Client assets of one page, as recorded in the manifest. */
export type PageAssets = z.output<typeof PageAssetsSchema>;

/**
 * Validates a parsed manifest.
 *
 * @param source - the manifest path, used in error messages.
 * @throws {WaavyError} `RELEASE_INVALID`.
 */
export function parseManifest(input: unknown, source: string): Manifest {
  return parseWithSchema(ManifestSchema, input, { code: 'RELEASE_INVALID', subject: `manifest ${source}` });
}
