/**
 * The `waavy.config.ts` schema.
 *
 * The config's `pages` map is the one and only place a page is defined: page
 * ID → module path. Page modules export a default React component and
 * nothing else waavy reads.
 *
 * Loading the file from disk is Bun-specific and lives in
 * `build/config-loader.ts`; this module only describes and validates the
 * shape, so it can be imported anywhere (including by `defineConfig` users).
 *
 * See ARCHITECTURE.md §4.1.
 */

import { z } from 'zod';

import { PageIdSchema } from './page-id';
import { MAX_TIMEOUT_MS } from './protocol';
import { parseWithSchema } from './validation';

/** URL prefix under which the host serves `<release>/client/`. */
export const DEFAULT_PUBLIC_PATH = '/assets/';

/** Where `waavy build` writes the release, relative to the config file. */
export const DEFAULT_OUT_DIR = './dist/waavy';

/** Render deadline used when a request does not set `timeoutMs`. */
export const DEFAULT_RENDER_TIMEOUT_MS = 10_000;

/** `publicPath` must be an absolute path or an http(s) URL, ending in `/`. */
const PublicPathSchema = z
  .string()
  .refine((value) => value.endsWith('/'), 'must end with "/"')
  .refine(
    (value) => value.startsWith('/') || /^https?:\/\//.test(value),
    'must be an absolute path ("/assets/") or an http(s) URL'
  );

const RenderDefaultsSchema = z.strictObject({
  /** Deadline for renders that do not set `timeoutMs`. */
  timeoutMs: z.number().int().min(1).max(MAX_TIMEOUT_MS).default(DEFAULT_RENDER_TIMEOUT_MS)
});

/** Schema for the default export of `waavy.config.*`. */
export const WaavyConfigSchema = z.strictObject({
  /** Page ID → module path (relative to the config file). At least one entry. */
  pages: z
    .record(PageIdSchema, z.string().min(1))
    .refine((pages) => Object.keys(pages).length > 0, 'must register at least one page'),
  /** URL prefix for client assets. */
  publicPath: PublicPathSchema.default(DEFAULT_PUBLIC_PATH),
  /** Release output directory (relative to the config file). */
  outDir: z.string().min(1).default(DEFAULT_OUT_DIR),
  /** Render defaults recorded in the release manifest. */
  render: RenderDefaultsSchema.prefault({})
});

/** What users write in `waavy.config.ts`. */
export type WaavyConfigInput = z.input<typeof WaavyConfigSchema>;

/** A validated config with defaults applied. */
export type WaavyConfig = z.output<typeof WaavyConfigSchema>;

/**
 * Typed identity helper for `waavy.config.ts`:
 *
 * ```ts
 * import { defineConfig } from '@bundt/waavy';
 * export default defineConfig({ pages: { home: './pages/home.tsx' } });
 * ```
 */
export function defineConfig(config: WaavyConfigInput): WaavyConfigInput {
  return config;
}

/**
 * Validates a loaded config value.
 *
 * @param source - the config file path, used in error messages.
 * @throws {WaavyError} `CONFIG_INVALID`.
 */
export function parseConfig(input: unknown, source: string): WaavyConfig {
  return parseWithSchema(WaavyConfigSchema, input, { code: 'CONFIG_INVALID', subject: `config ${source}` });
}
