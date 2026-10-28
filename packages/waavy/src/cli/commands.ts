/**
 * `waavy` command implementations. Each command receives already-parsed flags
 * and a {@link CommandIO}, and returns its exit code; argument parsing lives
 * in `cli/index.ts`.
 */

import pc from 'picocolors';

import { buildRelease } from '../build/build-release';
import type { CommandIO } from '../transport/io';
import { EXIT_SUCCESS, reportFailure, runOneshot } from '../transport/oneshot';
import { reportHumanError } from './output';
import { type RenderFlags, renderInvocationFromFlags } from './render-request';

/** Raw `waavy build` options as parsed by cac. */
export type BuildFlags = {
  root?: unknown;
  config?: unknown;
  out?: unknown;
  /** `false` when `--no-minify` is given. */
  minify?: unknown;
};

/** `waavy build`: writes a release and prints where it went. */
export async function buildCommand(flags: BuildFlags, io: CommandIO): Promise<number> {
  try {
    const built = await buildRelease({
      root: typeof flags.root === 'string' ? flags.root : process.cwd(),
      ...(typeof flags.config === 'string' ? { configPath: flags.config } : {}),
      ...(typeof flags.out === 'string' ? { outDir: flags.out } : {}),
      production: flags.minify !== false
    });
    const pageCount = Object.keys(built.manifest.pages).length;
    await io.writeStdout(
      `${pc.green('built')} release ${pc.bold(built.manifest.buildId)} (${pageCount} page${pageCount === 1 ? '' : 's'}) → ${built.dir}\n`
    );
    return EXIT_SUCCESS;
  } catch (error) {
    return reportHumanError(io, error);
  }
}

/** `waavy render`: one-shot render; see `transport/oneshot.ts` for the output contract. */
export async function renderCommand(flags: RenderFlags, io: CommandIO): Promise<number> {
  try {
    const invocation = await renderInvocationFromFlags(flags, io.readStdin);
    return await runOneshot(invocation, io);
  } catch (error) {
    return reportFailure(io, error);
  }
}
