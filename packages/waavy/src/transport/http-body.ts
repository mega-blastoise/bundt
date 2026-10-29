/**
 * Reading JSON request bodies with a size limit.
 */

import type { IncomingMessage } from 'node:http';

import { describeError, WaavyError } from '../core/errors';

/**
 * Oversized bodies are read and discarded (so the client can receive the
 * 413) up to this multiple of the limit; beyond it the connection is dropped.
 */
const DISCARD_FACTOR = 4;

/** Thrown when the body exceeds the limit; mapped to HTTP 413. */
export class BodyTooLargeError extends WaavyError {
  constructor(limit: number) {
    super('INVALID_REQUEST', `Request body exceeds ${limit} bytes`);
  }
}

/**
 * Reads and parses a JSON body.
 *
 * - Requires a JSON content type so that browsers cannot submit render
 *   requests through plain HTML forms.
 * - An oversized body is consumed without buffering and then rejected. The
 *   body must be fully read before responding: answering early leaves the
 *   connection unusable under Bun's `node:http` (the client sees a reset
 *   instead of the 413, and keep-alive requests stall). Bodies beyond
 *   `limit × DISCARD_FACTOR` destroy the connection instead.
 *
 * @throws {WaavyError} `INVALID_REQUEST` (a {@link BodyTooLargeError} for oversized bodies).
 */
export async function readJsonBody(request: IncomingMessage, limit: number): Promise<unknown> {
  const contentType = request.headers['content-type'] ?? '';
  if (!/^application\/json\b/i.test(contentType)) {
    await discardBody(request, limit * DISCARD_FACTOR);
    throw new WaavyError('INVALID_REQUEST', 'Content-Type must be application/json');
  }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > limit) {
      await discardBody(request, limit * DISCARD_FACTOR - size);
      throw new BodyTooLargeError(limit);
    }
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch (error) {
    throw new WaavyError('INVALID_REQUEST', `Request body is not valid JSON: ${describeError(error)}`);
  }
}

/** Reads the rest of the body without keeping it; destroys the request past `budget` bytes. */
async function discardBody(request: IncomingMessage, budget: number): Promise<void> {
  let remaining = budget;
  for await (const chunk of request) {
    remaining -= (chunk as Buffer).length;
    if (remaining < 0) {
      request.destroy();
      return;
    }
  }
}
