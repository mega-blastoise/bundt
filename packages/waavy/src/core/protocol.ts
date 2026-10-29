/**
 * The host protocol: what a host application sends to waavy and what it gets
 * back on failure. One request shape serves every transport (one-shot CLI,
 * HTTP, in-process `createRenderer`).
 *
 * The Zod schemas here are the single source of truth. The JSON Schema
 * published at `@bundt/waavy/protocol.schema.json` is generated from them
 * (see {@link protocolJsonSchema}) so that non-JS clients can validate
 * against exactly the same contract.
 *
 * See ARCHITECTURE.md §5.
 */

import { z } from 'zod';

import { ERROR_CODE_NAMES } from './errors';
import { PageIdSchema } from './page-id';
import { parseWithSchema } from './validation';

/** Version of the host protocol. Bumped only for breaking changes. */
export const PROTOCOL_VERSION = 1;

/** Upper bound for `timeoutMs`, protecting hosts from runaway renders. */
export const MAX_TIMEOUT_MS = 120_000;

/** Props are an arbitrary JSON object; they become the page component's props. */
export const PropsSchema = z.record(z.string(), z.json());

/**
 * Host-controlled parts of the document shell. `head` is inserted verbatim
 * and is therefore trusted HTML: hosts must never pass end-user input here.
 */
export const DocumentOptionsSchema = z.strictObject({
  /** Text for `<title>`; HTML-escaped by waavy. */
  title: z.string().optional(),
  /** BCP 47 language tag for `<html lang>`. Defaults to `"en"`. */
  lang: z
    .string()
    .regex(/^[A-Za-z0-9-]{1,35}$/, 'must be a BCP 47 language tag')
    .optional(),
  /** Trusted HTML appended inside `<head>` (meta tags, extra links, …). */
  head: z.string().optional()
});

/** A request to render one registered page with host-supplied props. */
export const RenderRequestSchema = z.strictObject({
  /** Protocol version; must equal {@link PROTOCOL_VERSION}. */
  v: z.literal(PROTOCOL_VERSION),
  /** Registered page ID. */
  page: PageIdSchema,
  /** JSON props for the page component. Defaults to `{}`. */
  props: PropsSchema.default({}),
  /** Document shell options. */
  document: DocumentOptionsSchema.optional(),
  /** Stream the response instead of buffering it. Defaults to `false`. */
  stream: z.boolean().default(false),
  /** Render deadline in milliseconds. Defaults to the release's configured value. */
  timeoutMs: z.number().int().min(1).max(MAX_TIMEOUT_MS).optional()
});

/** The failure body shared by every transport. */
export const ErrorBodySchema = z.strictObject({
  error: z.strictObject({
    code: z.enum(ERROR_CODE_NAMES),
    message: z.string(),
    page: z.string().optional()
  })
});

/** A validated render request, with defaults applied. */
export type RenderRequest = z.output<typeof RenderRequestSchema>;

/** What callers may pass before defaults are applied. */
export type RenderRequestInput = z.input<typeof RenderRequestSchema>;

/** Document shell options from a render request. */
export type DocumentOptions = z.output<typeof DocumentOptionsSchema>;

/** JSON props for a page component. */
export type PageProps = z.output<typeof PropsSchema>;

/**
 * Validates an untrusted render request.
 *
 * @throws {WaavyError} `INVALID_REQUEST` describing every problem found.
 */
export function parseRenderRequest(input: unknown): RenderRequest {
  return parseWithSchema(RenderRequestSchema, input, {
    code: 'INVALID_REQUEST',
    subject: 'render request'
  });
}

/**
 * Builds the JSON Schema document published with the package. Request
 * schemas describe *input* (defaults optional); the error body describes
 * output.
 *
 * Each definition is a self-contained schema resource with its own `$id`, so
 * the `$ref`s Zod generates inside it (`#/$defs/...`) resolve within that
 * definition. Consumers can validate against `$defs.RenderRequest` directly.
 */
export function protocolJsonSchema(): Record<string, unknown> {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'waavy host protocol',
    description: `Host protocol version ${PROTOCOL_VERSION}. See packages/waavy/docs/PROTOCOL.md.`,
    protocolVersion: PROTOCOL_VERSION,
    $defs: {
      RenderRequest: schemaResource('RenderRequest', RenderRequestSchema, 'input'),
      ErrorBody: schemaResource('ErrorBody', ErrorBodySchema, 'output')
    }
  };
}

/** Converts one Zod schema into a standalone, JSON-serializable schema resource. */
function schemaResource(name: string, schema: z.ZodType, io: 'input' | 'output'): Record<string, unknown> {
  // The JSON round-trip drops non-JSON values; Zod also attaches a
  // `~standard` (Standard Schema) property that does not belong in JSON Schema.
  const json = JSON.parse(JSON.stringify(z.toJSONSchema(schema, { io }))) as Record<string, unknown>;
  delete json['~standard'];
  delete json['$schema'];
  return { $id: `urn:waavy:protocol:${PROTOCOL_VERSION}:${name}`, title: name, ...json };
}
