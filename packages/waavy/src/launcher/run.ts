/**
 * Runs the native binary as a transparent child of the launcher.
 *
 * - stdio is inherited, so stdout/stderr/stdin are the binary's own (the
 *   one-shot contract — HTML on stdout, JSON lines on stderr — is unchanged
 *   by going through `npx waavy`);
 * - SIGINT/SIGTERM/SIGHUP sent to the launcher are forwarded, so process
 *   managers that signal only the launcher's PID still stop `waavy serve`
 *   gracefully. (A terminal Ctrl-C reaches both processes; `waavy serve`
 *   treats repeated shutdown signals as one.)
 * - the launcher's exit code mirrors the child's (`exit-code.ts`).
 */

import { spawn } from 'node:child_process';
import { constants } from 'node:os';

import { exitCodeFor } from './exit-code';

/** Signals the launcher passes on to the binary. */
export const FORWARDED_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;

/** Exit code when the binary cannot be started at all. */
export const EXIT_SPAWN_FAILED = 126;

/** Runs `binary` with `args` and resolves with the exit code to use. */
export function runBinary(binary: string, args: readonly string[]): Promise<number> {
  const child = spawn(binary, args, { stdio: 'inherit' });

  const forward = (signal: NodeJS.Signals) => {
    child.kill(signal);
  };
  for (const signal of FORWARDED_SIGNALS) process.on(signal, forward);
  const stopForwarding = () => {
    for (const signal of FORWARDED_SIGNALS) process.off(signal, forward);
  };

  return new Promise((resolve) => {
    child.once('error', (error) => {
      stopForwarding();
      process.stderr.write(`waavy: cannot run ${binary}: ${error.message}\n`);
      resolve(EXIT_SPAWN_FAILED);
    });
    child.once('exit', (code, signal) => {
      stopForwarding();
      resolve(exitCodeFor(code, signal, constants.signals));
    });
  });
}
