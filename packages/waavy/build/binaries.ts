/**
 * Cross-compiles the `waavy` CLI for distribution (P3 T1).
 *
 *   bun build/binaries.ts                     # every target in build/targets.ts
 *   bun build/binaries.ts --host-only         # just this machine's npm platform
 *   bun build/binaries.ts --target linux-x64 --target linux-arm64-musl
 *
 * `--target` takes a release-asset name (`darwin-arm64`, `linux-x64-musl`, …)
 * or a Bun target (`bun-linux-x64-baseline`). Bun downloads each foreign
 * runtime on first use and caches it, so every target builds from any host.
 *
 * Output locations are described in `build/targets.ts`. For local
 * development and tests, `build/binary.ts` (`bun run build:binary`) is still
 * the quick path: it writes `dist/bin/waavy` for the host only.
 */

import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { COMPILE_FLAGS, compileBinary } from './binary';
import { BINARY_TARGETS, type BinaryTarget, hostTarget } from './targets';

const packageRoot = resolve(import.meta.dir, '..');

/** The targets selected by the command line. */
function selectTargets(argv: readonly string[]): readonly BinaryTarget[] {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      target: { type: 'string', multiple: true },
      'host-only': { type: 'boolean', default: false }
    },
    strict: true
  });

  if (values['host-only']) {
    const host = hostTarget();
    if (host === undefined) throw new Error(`waavy ships no npm binary for ${process.platform}-${process.arch}`);
    return [host];
  }
  if (values.target === undefined) return BINARY_TARGETS;

  return values.target.map((name) => {
    const target = BINARY_TARGETS.find((candidate) => candidate.asset === name || candidate.bunTarget === name);
    if (target === undefined) {
      const known = BINARY_TARGETS.map((candidate) => candidate.asset).join(', ');
      throw new Error(`Unknown target "${name}". Known targets: ${known}`);
    }
    return target;
  });
}

const targets = selectTargets(Bun.argv.slice(2));

// Sequential on purpose: each compile is mostly I/O on a ~60 MB file, and
// sequential output keeps CI logs readable. The full set takes seconds.
for (const target of targets) {
  const outDir = join(packageRoot, target.outDir);
  await mkdir(outDir, { recursive: true });
  const outfile = join(outDir, target.fileName);
  await compileBinary({ outfile, bunTarget: target.bunTarget });
  console.log(`Compiled ${target.asset.padEnd(18)} ${target.bunTarget.padEnd(24)} → ${target.outDir}/${target.fileName}`);
}

console.log(`Built ${targets.length} binaries (${COMPILE_FLAGS.join(' ')})`);
