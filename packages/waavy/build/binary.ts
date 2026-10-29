/**
 * Compiles the `waavy` CLI into a standalone executable.
 *
 * Run directly (`bun run build:binary`) it builds the host platform's
 * binary at `dist/bin/waavy` (`waavy.exe` on Windows) for local development
 * and tests. `build/binaries.ts` reuses `compileBinary` for the
 * cross-platform distribution builds.
 *
 * The CLI never imports React (releases bundle their own), so the binary is
 * fully self-contained.
 *
 * Autoload flags: compiled Bun executables do not read `package.json` or
 * `tsconfig.json` at runtime by default, which breaks resolving packages
 * through their `main`/`exports` fields when `waavy build` imports the
 * user's `waavy.config.ts` (it imports `@bundt/waavy`). Both are enabled so
 * user files resolve exactly as they would under `bun`. `.env` and
 * `bunfig.toml` autoloading stay off so the binary's behavior does not change
 * with the working directory. See spikes/P1_SPIKES.md (S1b).
 */

import { join, resolve } from 'node:path';

/** Flags that make runtime module resolution match the `bun` CLI. */
export const COMPILE_FLAGS = ['--compile-autoload-package-json', '--compile-autoload-tsconfig'] as const;

const packageRoot = resolve(import.meta.dir, '..');
const CLI_ENTRY = join(packageRoot, 'src/cli/main.ts');

/** Options for one compile. */
export type CompileOptions = {
  /** Absolute output path of the executable. */
  outfile: string;
  /** Bun `--target` (e.g. `bun-linux-arm64`); the host platform when omitted. */
  bunTarget?: string;
};

/** Compiles the CLI entry into a single executable. */
export async function compileBinary(options: CompileOptions): Promise<void> {
  const target = options.bunTarget === undefined ? [] : [`--target=${options.bunTarget}`];
  await Bun.$`bun build --compile --minify ${COMPILE_FLAGS} ${target} ${CLI_ENTRY} --outfile ${options.outfile}`;
}

if (import.meta.main) {
  const outfile = join(packageRoot, 'dist', 'bin', process.platform === 'win32' ? 'waavy.exe' : 'waavy');
  await compileBinary({ outfile });
  console.log(`Compiled ${outfile}`);
}
