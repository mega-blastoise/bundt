/**
 * Entry point of the npm `waavy` command (`bin/waavy.js` → `dist/launcher.js`).
 *
 * The npm package ships no native code itself: this launcher, which runs
 * under plain Node or Bun with no dependencies, finds the platform binary
 * (`resolve.ts`) and runs it (`run.ts`). Hosts that call waavy from another
 * language should invoke the binary directly and skip the launcher.
 *
 * A missing binary is reported in plain text with exit code 127 (the
 * shell's "command not found"), distinct from every waavy error exit code.
 */

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

import { BinaryNotFoundError, resolveBinary } from './resolve';
import { runBinary } from './run';

/** Exit code when no binary can be found. */
const EXIT_BINARY_NOT_FOUND = 127;

async function main(): Promise<number> {
  let binary: string;
  try {
    binary = resolveBinary({
      env: process.env,
      os: process.platform,
      cpu: process.arch,
      resolveModule: createRequire(import.meta.url).resolve,
      fileExists: existsSync
    });
  } catch (error) {
    if (!(error instanceof BinaryNotFoundError)) throw error;
    process.stderr.write(`waavy: ${error.message}\n`);
    return EXIT_BINARY_NOT_FOUND;
  }
  return runBinary(binary, process.argv.slice(2));
}

process.exitCode = await main();
