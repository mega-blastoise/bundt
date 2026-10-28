/**
 * Human-readable CLI output (used by commands whose output is for people,
 * like `waavy build`; `waavy render` speaks JSON lines instead).
 */

import pc from 'picocolors';

import { ERROR_CODES, toWaavyError } from '../core/errors';
import type { CommandIO } from '../transport/io';

/**
 * Prints `error [CODE] message` to stderr and returns the code's exit status.
 */
export function reportHumanError(io: CommandIO, error: unknown): number {
  const waavyError = toWaavyError(error);
  io.writeStderrLine(`${pc.red('error')} ${pc.dim(`[${waavyError.code}]`)} ${waavyError.message}`);
  return ERROR_CODES[waavyError.code].exit;
}
