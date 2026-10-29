/**
 * Version constants shared by every waavy layer.
 *
 * `WAAVY_VERSION` mirrors `package.json#version`. It is a literal (rather than
 * an import of `package.json`) so that declaration emit stays rooted at `src/`
 * and so the value is inlined verbatim into release bundles. `version.test.ts`
 * fails if the two drift; bump both together.
 */

/** The version of `@bundt/waavy` this source tree represents. */
export const WAAVY_VERSION = '0.3.0';
