/**
 * Deriving per-page client assets from a Bun build metafile.
 *
 * For each page this finds the output produced from its client entry, the
 * CSS bundle Bun associated with it, and every chunk reachable through static
 * `import` statements (candidates for `modulepreload`). Dynamic imports are
 * excluded: they load on demand.
 *
 * Metafile path conventions (verified in spike S2, see spikes/P1_SPIKES.md):
 * - output keys, `cssBundle`, and `imports[].path` are relative to `outdir`
 *   and may carry redundant `./` segments;
 * - `entryPoint` is relative to the process working directory.
 */

import { posix, resolve } from 'node:path';

import { WaavyError } from '../core/errors';
import type { PageAssets } from '../core/manifest';

/** The subset of Bun's metafile this module reads. */
export type ClientMetafile = {
  outputs: Readonly<
    Record<
      string,
      {
        entryPoint?: string;
        cssBundle?: string;
        imports: ReadonlyArray<{ path: string; kind: string }>;
      }
    >
  >;
};

/**
 * Maps every page to its assets.
 *
 * @param clientEntries - page ID → absolute path of its generated client entry.
 * @param cwd - working directory the build ran in (base of `entryPoint`).
 * @throws {WaavyError} `BUILD_FAILED` if a page has no matching output.
 */
export function pageAssetsFromMetafile(
  metafile: ClientMetafile,
  clientEntries: ReadonlyMap<string, string>,
  cwd: string
): Record<string, PageAssets> {
  const outputs = normalizeOutputs(metafile);
  const outputByEntry = new Map<string, string>();
  for (const [outputPath, output] of outputs) {
    if (output.entryPoint !== undefined && outputPath.endsWith('.js')) {
      outputByEntry.set(resolve(cwd, output.entryPoint), outputPath);
    }
  }

  const assets: Record<string, PageAssets> = {};
  for (const [pageId, entryFile] of clientEntries) {
    const client = outputByEntry.get(entryFile);
    const output = client === undefined ? undefined : outputs.get(client);
    if (client === undefined || output === undefined) {
      throw new WaavyError('BUILD_FAILED', `Client build produced no output for page "${pageId}"`, { page: pageId });
    }
    assets[pageId] = {
      client,
      css: output.cssBundle === undefined ? [] : [normalizePath(output.cssBundle)],
      preload: collectStaticImports(client, outputs)
    };
  }
  return assets;
}

type NormalizedOutput = {
  entryPoint?: string;
  cssBundle?: string;
  imports: string[];
};

/** Re-keys outputs by normalized path and keeps only static JS imports. */
function normalizeOutputs(metafile: ClientMetafile): Map<string, NormalizedOutput> {
  const outputs = new Map<string, NormalizedOutput>();
  for (const [path, output] of Object.entries(metafile.outputs)) {
    outputs.set(normalizePath(path), {
      ...(output.entryPoint === undefined ? {} : { entryPoint: output.entryPoint }),
      ...(output.cssBundle === undefined ? {} : { cssBundle: output.cssBundle }),
      imports: output.imports
        .filter((dependency) => dependency.kind === 'import-statement')
        .map((dependency) => normalizePath(dependency.path))
    });
  }
  return outputs;
}

/** Breadth-first walk of static imports starting at `entry` (exclusive), in discovery order. */
function collectStaticImports(entry: string, outputs: ReadonlyMap<string, NormalizedOutput>): string[] {
  const seen = new Set<string>([entry]);
  const queue = [...(outputs.get(entry)?.imports ?? [])];
  const result: string[] = [];
  while (queue.length > 0) {
    const next = queue.shift();
    if (next === undefined || seen.has(next)) continue;
    seen.add(next);
    result.push(next);
    queue.push(...(outputs.get(next)?.imports ?? []));
  }
  return result;
}

/** `"././a/b.js"` → `"a/b.js"`. */
function normalizePath(path: string): string {
  return posix.normalize(path.replaceAll('\\', '/')).replace(/^(\.\/)+/, '');
}
