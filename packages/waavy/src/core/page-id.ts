/**
 * Page identifiers.
 *
 * A page ID is the stable name a host uses to ask for a page (`"product"`,
 * `"account/settings"`). It appears in `waavy.config.ts`, the release
 * manifest, render requests, and generated entry files, so its grammar is
 * defined exactly once, here.
 */

import { z } from 'zod';

/**
 * Lowercase segments of `[a-z0-9_-]` separated by single `/`, starting with an
 * alphanumeric character. Deliberately conservative: IDs double as file names
 * for generated client entries, so they must be safe on every filesystem.
 */
export const PAGE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*(?:\/[a-z0-9_-]+)*$/;

/** Zod schema for a page ID. */
export const PageIdSchema = z
  .string()
  .regex(PAGE_ID_PATTERN, 'must be lowercase segments of [a-z0-9_-] separated by "/"');
