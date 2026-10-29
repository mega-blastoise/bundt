/**
 * `@bundt/waavy` — configuration helper and protocol types.
 *
 * - Use {@link defineConfig} in `waavy.config.ts`.
 * - Import the request/error types when talking to waavy from TypeScript.
 * - For in-process rendering from a Bun server, see `@bundt/waavy/server`.
 */

export { defineConfig, type WaavyConfig, type WaavyConfigInput } from './core/config';
export { ERROR_CODES, type ErrorBody, type ErrorCode } from './core/errors';
export {
  type DocumentOptions,
  type PageProps,
  PROTOCOL_VERSION,
  type RenderRequest,
  type RenderRequestInput
} from './core/protocol';
export { WAAVY_VERSION } from './core/version';
