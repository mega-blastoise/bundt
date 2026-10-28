/**
 * Package build for `@bundt/waavy` (not to be confused with `src/build/`,
 * which implements `waavy build` for users' projects).
 *
 * Produces `dist/`:
 * - `index.js`, `server.js`, `entry-server.js`, `cli.js` — Bun-target bundles;
 * - `browser.js` — browser-target bundle used by generated client entries;
 * - `protocol.schema.json` — JSON Schema generated from the protocol schemas.
 * Declarations are emitted separately by `tsc -p tsconfig.build.json`.
 *
 * Dependencies stay external (`packages: 'external'` from the shared base
 * config): consumers' bundlers and Bun resolve them from `node_modules`.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { concurrent_build, createBaseConfig } from '@bundt/internal-build-utils';

import { protocolJsonSchema } from '../src/core/protocol';

const packageRoot = resolve(import.meta.dir, '..');
const distDir = join(packageRoot, 'dist');

/** One bundle: source entry → output file name. */
type Bundle = { entry: string; output: string; target: Bun.Target };

const BUNDLES: readonly Bundle[] = [
  { entry: 'src/index.ts', output: 'index.js', target: 'bun' },
  { entry: 'src/server.ts', output: 'server.js', target: 'bun' },
  { entry: 'src/entry-server.ts', output: 'entry-server.js', target: 'bun' },
  { entry: 'src/cli/main.ts', output: 'cli.js', target: 'bun' },
  { entry: 'src/browser.ts', output: 'browser.js', target: 'browser' }
];

await mkdir(distDir, { recursive: true });

const base = createBaseConfig({ outdir: distDir });
await concurrent_build(
  ...BUNDLES.map(
    (bundle): Bun.BuildConfig => ({
      ...base,
      root: packageRoot,
      entrypoints: [join(packageRoot, bundle.entry)],
      target: bundle.target,
      naming: { entry: bundle.output }
    })
  )
);

await writeFile(
  join(distDir, 'protocol.schema.json'),
  `${JSON.stringify(protocolJsonSchema(), null, 2)}\n`,
  'utf8'
);
console.log('Wrote dist/protocol.schema.json');
