/**
 * Maps how the native binary ended to the launcher's own exit code, so
 * callers of `npx waavy …` observe the same status as callers of the binary.
 */

/** The shell convention for "killed by signal N". */
const SIGNAL_EXIT_BASE = 128;

/** Exit code when the signal number is unknown (should not happen). */
const UNKNOWN_SIGNAL_EXIT = 1;

/**
 * The launcher's exit code for a child that exited with `code`, or was
 * killed by `signal`.
 *
 * @param signalNumbers - signal name → number (`os.constants.signals`).
 */
export function exitCodeFor(
  code: number | null,
  signal: string | null,
  signalNumbers: Readonly<Record<string, number>>
): number {
  if (code !== null) return code;
  if (signal === null) return UNKNOWN_SIGNAL_EXIT;
  const number = signalNumbers[signal];
  return number === undefined ? UNKNOWN_SIGNAL_EXIT : SIGNAL_EXIT_BASE + number;
}
