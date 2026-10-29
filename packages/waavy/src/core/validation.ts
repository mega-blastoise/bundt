/**
 * Schema validation helpers.
 *
 * Every untrusted input in waavy (render requests, config files, release
 * manifests) is validated with Zod and, on failure, converted into a
 * {@link WaavyError} with a compact, single-line summary of what was wrong.
 * Centralizing that conversion keeps error messages consistent everywhere.
 */

import type { z } from 'zod';

import { type ErrorCode, WaavyError } from './errors';

/** Maximum number of individual issues included in an error message. */
const MAX_REPORTED_ISSUES = 5;

/**
 * Renders Zod issues as `path: message; path: message`, truncated to
 * {@link MAX_REPORTED_ISSUES} entries. The root path is shown as `(root)`.
 */
export function summarizeIssues(error: z.ZodError): string {
  const parts = error.issues.slice(0, MAX_REPORTED_ISSUES).map((issue) => {
    const path = issue.path.length === 0 ? '(root)' : issue.path.map(String).join('.');
    return `${path}: ${issue.message}`;
  });
  const hidden = error.issues.length - parts.length;
  return hidden > 0 ? `${parts.join('; ')}; …and ${hidden} more` : parts.join('; ');
}

/** Describes how a validation failure should be reported. */
export type ValidationFailure = {
  /** The error code to raise. */
  code: ErrorCode;
  /** What was being validated, e.g. `"render request"` or a file path. */
  subject: string;
  /** Page ID to attach to the error, when relevant. */
  page?: string;
};

/**
 * Parses `input` with `schema`, returning the typed output or throwing a
 * {@link WaavyError} built from `failure`.
 */
export function parseWithSchema<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
  failure: ValidationFailure
): z.output<Schema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new WaavyError(failure.code, `Invalid ${failure.subject}: ${summarizeIssues(result.error)}`, {
    page: failure.page,
    cause: result.error
  });
}
