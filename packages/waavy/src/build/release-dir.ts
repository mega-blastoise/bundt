/**
 * Staging and publishing a release directory.
 *
 * A build writes into a sibling staging directory and only replaces the
 * previous release once everything succeeded, so a failed build never leaves
 * a half-written release behind and a running renderer's directory is
 * replaced in a single rename.
 */

import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { type Manifest, MANIFEST_FILE_NAME } from '../core/manifest';

/** Creates an empty staging directory next to `outDir` and returns its path. */
export async function createStagingDir(outDir: string, buildId: string): Promise<string> {
  const staging = `${outDir}.staging-${buildId}`;
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });
  return staging;
}

/** Writes `manifest.json` into a release directory. */
export async function writeManifest(releaseDir: string, manifest: Manifest): Promise<void> {
  await writeFile(join(releaseDir, MANIFEST_FILE_NAME), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

/**
 * Moves `staging` to `outDir`, replacing any previous release. If the final
 * rename fails, the previous release is restored.
 */
export async function publishStagingDir(staging: string, outDir: string, buildId: string): Promise<void> {
  const previous = `${outDir}.previous-${buildId}`;
  const hadPrevious = await rename(outDir, previous).then(
    () => true,
    () => false
  );
  try {
    await rename(staging, outDir);
  } catch (error) {
    if (hadPrevious) await rename(previous, outDir);
    throw error;
  }
  if (hadPrevious) await rm(previous, { recursive: true, force: true });
}

/** Removes a directory tree, ignoring errors (used for best-effort cleanup). */
export async function removeQuietly(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true }).catch(() => undefined);
}
