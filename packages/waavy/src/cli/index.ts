/**
 * The `waavy` command line.
 *
 * This module only declares commands and flags (with cac) and dispatches to
 * `cli/commands.ts`. It returns exit codes instead of calling
 * `process.exit`, so stdout is always flushed and the CLI is testable
 * in-process.
 */

import { cac } from 'cac';

import { WaavyError } from '../core/errors';
import { WAAVY_VERSION } from '../core/version';
import { type CommandIO, processIO } from '../transport/io';
import { reportFailure } from '../transport/oneshot';
import { buildCommand, renderCommand } from './commands';
import { reportHumanError } from './output';

/** Exit code when no command matched (help is printed). */
const EXIT_USAGE = 2;

/** Commands whose errors must be JSON lines on stderr (machine contract). */
const JSON_ERROR_COMMANDS = new Set(['render']);

/**
 * Runs the CLI.
 *
 * @param argv - full `process.argv`-style array (executable and script first).
 * @returns the exit code.
 */
export async function runCli(argv: readonly string[], io: CommandIO = processIO()): Promise<number> {
  const cli = cac('waavy');
  // Each action stores its exit code here; cac itself ignores return values
  // of the help/version paths.
  let exitCode: number | undefined;

  cli
    .command('build', 'Build a release from waavy.config.*')
    .option('--root <dir>', 'Directory containing waavy.config.* (default: cwd)')
    .option('--config <path>', 'Explicit config file')
    .option('--out <dir>', 'Release output directory (overrides the config outDir)')
    .option('--no-minify', 'Skip minification and use React development builds')
    .action(async (flags: Record<string, unknown>) => {
      exitCode = await buildCommand(flags, io);
    });

  cli
    .command('render', 'Render one page to stdout')
    .option('--release <dir>', 'Release directory produced by `waavy build`')
    .option('--page <id>', 'Registered page ID')
    .option('--props <json>', 'Page props as a JSON object')
    .option('--props-file <path>', 'Read page props from a JSON file')
    .option('--stdin', 'Read a complete JSON render request from stdin')
    .option('--title <text>', 'Document <title>')
    .option('--lang <tag>', 'Document <html lang>')
    .option('--head <html>', 'Trusted HTML appended to <head>')
    .option('--stream', 'Stream HTML as it renders instead of buffering')
    .option('--timeout <ms>', 'Render deadline in milliseconds')
    .action(async (flags: Record<string, unknown>) => {
      exitCode = await renderCommand(flags, io);
    });

  cli.help();
  cli.version(WAAVY_VERSION);

  try {
    const parsed = cli.parse([...argv], { run: false });
    if (cli.matchedCommand === undefined) {
      if (parsed.options['help'] === true || parsed.options['version'] === true) return 0;
      cli.outputHelp();
      return EXIT_USAGE;
    }
    await cli.runMatchedCommand();
    return exitCode ?? 0;
  } catch (error) {
    // cac reports unknown options / missing values by throwing.
    return JSON_ERROR_COMMANDS.has(cli.matchedCommandName ?? '')
      ? reportFailure(io, toInvalidRequest(error))
      : reportHumanError(io, error);
  }
}

/** Argument errors from cac are request errors from the caller's point of view. */
function toInvalidRequest(error: unknown): unknown {
  return error instanceof Error && error.name === 'CACError'
    ? new WaavyError('INVALID_REQUEST', error.message, { cause: error })
    : error;
}
