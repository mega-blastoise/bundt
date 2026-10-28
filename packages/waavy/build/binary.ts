/**
 * Compiles the `waavy` CLI into a standalone executable for the host
 * platform: `dist/bin/waavy` (`waavy.exe` on Windows). Cross-platform
 * targets are added in Phase 3 (`build/binaries.ts`).
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
const outfile = join(packageRoot, 'dist', 'bin', process.platform === 'win32' ? 'waavy.exe' : 'waavy');

await Bun.$`bun build --compile --minify ${COMPILE_FLAGS} ${join(packageRoot, 'src/cli/main.ts')} --outfile ${outfile}`;
console.log(`Compiled ${outfile}`);
