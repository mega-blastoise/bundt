/**
 * The one-shot transport: render a single request and map the outcome onto
 * stdout, stderr, and an exit code.
 *
 * Contract (ARCHITECTURE.md §5.3, documented for hosts in PROTOCOL.md):
 * - **stdout** carries the HTML document and nothing else.
 * - **stderr** carries JSON lines only: one `{"warning":…}` per recoverable
 *   error and, on failure, exactly one `{"error":…}` (an `ErrorBody`).
 * - **exit code** is `0` on success, otherwise `ERROR_CODES[code].exit`.
 *   With `stream: true`, stdout may already hold partial HTML when a late
 *   failure happens; hosts must discard stdout whenever the exit code is
 *   non-zero.
 */

import { ERROR_CODES, toErrorBody } from '../core/errors';
import { parseRenderRequest } from '../core/protocol';
import type { RecoverableError } from '../core/render';
import { createRenderer } from '../runtime/renderer';
import type { CommandIO } from './io';

/** Exit code for success. */
export const EXIT_SUCCESS = 0;

/** What to render. */
export type OneshotInput = {
  /** Release directory. */
  release: string;
  /** Untrusted render request; validated here. */
  request: unknown;
};

/**
 * Renders one request.
 *
 * @returns the process exit code. Never throws.
 */
export async function runOneshot(input: OneshotInput, io: CommandIO): Promise<number> {
  try {
    const request = parseRenderRequest(input.request);
    const renderer = await createRenderer({ release: input.release });

    if (request.stream) {
      const document = await renderer.renderStream(request);
      for await (const chunk of document.stream) await io.writeStdout(chunk);
      reportWarnings(io, request.page, document.recoverableErrors());
    } else {
      const document = await renderer.render(request);
      await io.writeStdout(document.html);
      reportWarnings(io, request.page, document.recoverableErrors);
    }
    return EXIT_SUCCESS;
  } catch (error) {
    return reportFailure(io, error);
  }
}

/**
 * Writes the `{"error":…}` line for `error` and returns its exit code.
 * Exported so the CLI reports argument errors with the same contract.
 */
export function reportFailure(io: CommandIO, error: unknown): number {
  const body = toErrorBody(error);
  io.writeStderrLine(JSON.stringify(body));
  return ERROR_CODES[body.error.code].exit;
}

/** Writes one `{"warning":…}` line per recoverable error. */
function reportWarnings(io: CommandIO, page: string, errors: readonly RecoverableError[]): void {
  for (const error of errors) {
    io.writeStderrLine(JSON.stringify({ warning: { code: 'RECOVERABLE_ERROR', page, ...error } }));
  }
}
