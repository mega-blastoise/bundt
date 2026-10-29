/**
 * Executable entry point for the `waavy` CLI: the compiled binary and
 * `dist/cli.js` both start here. Sets the exit code instead of calling
 * `process.exit` so pending stdout writes are flushed first.
 */

import { runCli } from './index';

process.exitCode = await runCli(process.argv);
