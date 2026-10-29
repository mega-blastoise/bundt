/**
 * Packages the compiled binaries as GitHub release assets (P3 T7):
 *
 *   bun build/release-assets.ts <out-dir>
 *
 * For every target in `build/targets.ts` whose binary exists, writes
 * `waavy-<asset>.tar.gz` (`waavy-<asset>.zip` for Windows) containing the
 * executable and LICENSE at the archive root, then `SHA256SUMS` in the
 * format `sha256sum -c` / `shasum -a 256 -c` verify. Missing binaries are an
 * error: run `bun build/binaries.ts` first.
 *
 * Archive names carry no version so `releases/latest/download/…` URLs stay
 * stable across releases.
 */

import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

import { BINARY_TARGETS, type BinaryTarget } from './targets';

const packageRoot = resolve(import.meta.dir, '..');

/** The archive file name for a target. */
export function archiveName(target: BinaryTarget): string {
  return target.fileName.endsWith('.exe') ? `waavy-${target.asset}.zip` : `waavy-${target.asset}.tar.gz`;
}

/** Archives one target's binary into `outDir`; returns the archive path. */
async function archiveTarget(target: BinaryTarget, outDir: string): Promise<string> {
  const binary = join(packageRoot, target.outDir, target.fileName);
  if (!(await Bun.file(binary).exists())) {
    throw new Error(`${target.outDir}/${target.fileName} is missing; run \`bun build/binaries.ts\` first`);
  }

  // Stage the archive root so the archive holds bare file names.
  const stage = await mkdtemp(join(tmpdir(), `waavy-asset-${target.asset}-`));
  try {
    await copyFile(binary, join(stage, target.fileName));
    await copyFile(join(packageRoot, 'LICENSE'), join(stage, 'LICENSE'));
    const archive = join(outDir, archiveName(target));
    if (archive.endsWith('.zip')) {
      await Bun.$`zip -q -X ${archive} ${target.fileName} LICENSE`.cwd(stage);
    } else {
      await Bun.$`tar -czf ${archive} ${target.fileName} LICENSE`.cwd(stage);
    }
    return archive;
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}

/** `<sha256>  <file>` lines, sorted by file name. */
async function checksums(archives: readonly string[]): Promise<string> {
  const lines = await Promise.all(
    archives.map(async (archive) => {
      const digest = createHash('sha256').update(await readFile(archive)).digest('hex');
      return `${digest}  ${basename(archive)}`;
    })
  );
  return `${lines.sort((a, b) => a.localeCompare(b, 'en')).join('\n')}\n`;
}

if (import.meta.main) {
  const outArg = Bun.argv[2];
  if (outArg === undefined) throw new Error('usage: bun build/release-assets.ts <out-dir>');
  const outDir = resolve(outArg);
  await mkdir(outDir, { recursive: true });

  const archives: string[] = [];
  for (const target of BINARY_TARGETS) {
    archives.push(await archiveTarget(target, outDir));
    console.log(`Archived ${archiveName(target)}`);
  }
  await writeFile(join(outDir, 'SHA256SUMS'), await checksums(archives), 'utf8');
  console.log(`Wrote ${archives.length} archives and SHA256SUMS to ${outDir}`);
}
