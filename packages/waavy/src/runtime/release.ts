/**
 * Opening and validating a release directory.
 *
 * A release is validated *eagerly*, before any request is served: the
 * manifest must parse, its versions must match this runtime, every file it
 * references must exist, and the server entry must agree with the manifest.
 * A renderer that started successfully can therefore only fail per request
 * for request-specific reasons.
 *
 * See ARCHITECTURE.md §4.2.
 */

import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { describeError, WaavyError } from '../core/errors';
import { type Manifest, MANIFEST_FILE_NAME, MANIFEST_VERSION, parseManifest, RELEASE_CLIENT_DIR } from '../core/manifest';
import { PROTOCOL_VERSION } from '../core/protocol';
import { isReleaseEntry, RELEASE_ABI_VERSION, RELEASE_EXPORT_NAME, type ReleaseEntry } from '../core/release-abi';

/** A release that passed validation and whose server entry is loaded. */
export type OpenedRelease = {
  /** Absolute path of the release directory. */
  dir: string;
  manifest: Manifest;
  entry: ReleaseEntry;
};

/**
 * Loads and validates the release in `dir`.
 *
 * @throws {WaavyError} `RELEASE_INVALID` or `VERSION_MISMATCH`.
 */
export async function openRelease(dir: string): Promise<OpenedRelease> {
  const releaseDir = resolve(dir);
  const manifest = await readManifest(releaseDir);
  assertCompatibleManifest(manifest);
  await assertFilesExist(releaseDir, manifest);
  const entry = await importEntry(releaseDir, manifest);
  assertEntryMatchesManifest(entry, manifest);
  return { dir: releaseDir, manifest, entry };
}

async function readManifest(releaseDir: string): Promise<Manifest> {
  const manifestPath = join(releaseDir, MANIFEST_FILE_NAME);
  let text: string;
  try {
    text = await readFile(manifestPath, 'utf8');
  } catch (error) {
    throw new WaavyError('RELEASE_INVALID', `Cannot read ${manifestPath}: ${describeError(error)}`, { cause: error });
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new WaavyError('RELEASE_INVALID', `${manifestPath} is not valid JSON: ${describeError(error)}`, {
      cause: error
    });
  }
  return parseManifest(json, manifestPath);
}

/** Checks every version the runtime depends on, naming the first mismatch. */
function assertCompatibleManifest(manifest: Manifest): void {
  const checks: Array<[label: string, actual: number, expected: number]> = [
    ['manifest version', manifest.manifestVersion, MANIFEST_VERSION],
    ['release ABI', manifest.abi, RELEASE_ABI_VERSION],
    ['protocol version', manifest.protocolVersion, PROTOCOL_VERSION]
  ];
  for (const [label, actual, expected] of checks) {
    if (actual !== expected) {
      throw new WaavyError(
        'VERSION_MISMATCH',
        `Release ${manifest.buildId} uses ${label} ${actual}; this runtime supports ${expected}. Rebuild the release with a matching @bundt/waavy.`
      );
    }
  }
}

/** Ensures the server entry and every page asset in the manifest exist. */
async function assertFilesExist(releaseDir: string, manifest: Manifest): Promise<void> {
  const clientDir = join(releaseDir, RELEASE_CLIENT_DIR);
  const required = [
    join(releaseDir, manifest.server),
    ...Object.values(manifest.pages).flatMap((assets) =>
      [assets.client, ...assets.css, ...assets.preload].map((file) => join(clientDir, file))
    )
  ];
  for (const file of required) {
    const isFile = await stat(file).then(
      (stats) => stats.isFile(),
      () => false
    );
    if (!isFile) {
      throw new WaavyError('RELEASE_INVALID', `Release ${manifest.buildId} is missing ${file}`);
    }
  }
}

async function importEntry(releaseDir: string, manifest: Manifest): Promise<ReleaseEntry> {
  const entryPath = join(releaseDir, manifest.server);
  let module: Record<string, unknown>;
  try {
    module = (await import(pathToFileURL(entryPath).href)) as Record<string, unknown>;
  } catch (error) {
    throw new WaavyError('RELEASE_INVALID', `Cannot load ${entryPath}: ${describeError(error)}`, { cause: error });
  }
  const entry = module[RELEASE_EXPORT_NAME];
  if (!isReleaseEntry(entry)) {
    throw new WaavyError('RELEASE_INVALID', `${entryPath} does not export a valid "${RELEASE_EXPORT_NAME}" object`);
  }
  return entry;
}

/** The entry and manifest come from one build; anything else is a broken release. */
function assertEntryMatchesManifest(entry: ReleaseEntry, manifest: Manifest): void {
  if (entry.abi !== RELEASE_ABI_VERSION) {
    throw new WaavyError(
      'VERSION_MISMATCH',
      `Server entry implements release ABI ${entry.abi}; this runtime supports ${RELEASE_ABI_VERSION}.`
    );
  }
  if (entry.buildId !== manifest.buildId) {
    throw new WaavyError(
      'RELEASE_INVALID',
      `Server entry is from build ${entry.buildId} but the manifest is from ${manifest.buildId}.`
    );
  }
  const manifestPages = Object.keys(manifest.pages).sort();
  const entryPages = [...entry.pages].sort();
  if (manifestPages.join('\n') !== entryPages.join('\n')) {
    throw new WaavyError(
      'RELEASE_INVALID',
      `Server entry pages [${entryPages.join(', ')}] do not match manifest pages [${manifestPages.join(', ')}].`
    );
  }
}
