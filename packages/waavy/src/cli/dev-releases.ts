/**
 * `waavy serve --dev`: build a release from source, serve it, and rebuild on
 * every change.
 *
 * Dev mode is still release-shaped: each rebuild produces a normal release
 * in `node_modules/.cache/waavy/dev/<n>/` and is loaded through the same
 * `createRenderer` path as production. Each build lives at a new path, so its
 * server entry is a fresh module (Bun caches modules by path). Builds are
 * serialized; a change during a build schedules exactly one more. A failed
 * rebuild is logged and the last good release keeps serving.
 *
 * Known dev-only cost: superseded server entries stay loaded in memory until
 * the process exits.
 */

import { type FSWatcher, watch } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

import { buildRelease, type BuiltRelease } from '../build/build-release';
import { toErrorBody } from '../core/errors';
import { RELEASE_CLIENT_DIR } from '../core/manifest';
import { createRenderer } from '../runtime/renderer';
import type { Logger } from '../transport/access-log';
import type { ServedRelease } from '../transport/http-handler';

/** Quiet period after the last file change before rebuilding. */
const REBUILD_DEBOUNCE_MS = 100;

/** Dev builds kept on disk (the serving one plus the previous). */
const KEPT_BUILDS = 2;

/** Path segments whose changes never trigger a rebuild. */
const IGNORED_SEGMENTS = new Set(['node_modules', '.git', 'dist', '.turbo']);

/** Temporary copies made by fresh config imports (see config-loader.ts). */
const CONFIG_COPY_PATTERN = /(^|[\\/])\.waavy\.config\.[0-9a-f-]+\.\w+$/;

/** Options for {@link startDevReleases}. */
export type DevReleaseOptions = {
  root: string;
  configPath?: string;
  logger: Logger;
};

/** The live dev release plus a way to stop watching. */
export type DevReleases = {
  current: () => ServedRelease;
  close: () => Promise<void>;
};

/**
 * Builds the project once (failing fast if that build fails), then watches
 * for changes.
 *
 * @throws {WaavyError} from the initial build.
 */
export async function startDevReleases(options: DevReleaseOptions): Promise<DevReleases> {
  const root = resolve(options.root);
  const buildsDir = join(root, 'node_modules', '.cache', 'waavy', 'dev');
  let sequence = 0;

  const buildNext = async (): Promise<ServedRelease> => {
    sequence++;
    const built = await buildRelease({
      root,
      configPath: options.configPath,
      outDir: join(buildsDir, String(sequence).padStart(6, '0')),
      production: false,
      freshConfig: true
    });
    const served = await toServedRelease(built);
    await pruneOldBuilds(buildsDir, KEPT_BUILDS);
    return served;
  };

  await rm(buildsDir, { recursive: true, force: true });
  let served = await buildNext();
  options.logger.event('dev_build', { buildId: served.renderer.buildId });

  let building = false;
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const rebuild = async (): Promise<void> => {
    if (building) {
      pending = true;
      return;
    }
    building = true;
    try {
      served = await buildNext();
      options.logger.event('dev_build', { buildId: served.renderer.buildId });
    } catch (error) {
      options.logger.event('dev_build_failed', toErrorBody(error));
    } finally {
      building = false;
      if (pending) {
        pending = false;
        void rebuild();
      }
    }
  };

  const watcher: FSWatcher = watch(root, { recursive: true }, (_event, filename) => {
    if (filename === null || isIgnored(String(filename))) return;
    clearTimeout(timer);
    timer = setTimeout(() => void rebuild(), REBUILD_DEBOUNCE_MS);
  });

  return {
    current: () => served,
    async close() {
      clearTimeout(timer);
      watcher.close();
      await served.renderer.close();
    }
  };
}

async function toServedRelease(built: BuiltRelease): Promise<ServedRelease> {
  const renderer = await createRenderer({ release: built.dir });
  const { publicPath } = built.manifest;
  // Only path-style public paths can be served locally; CDN URLs are the host's business.
  return publicPath.startsWith('/')
    ? { renderer, assets: { publicPath, dir: join(built.dir, RELEASE_CLIENT_DIR) } }
    : { renderer };
}

/** Deletes all but the newest `keep` build directories (names sort by sequence). */
async function pruneOldBuilds(dir: string, keep: number): Promise<void> {
  const entries = (await readdir(dir).catch(() => [])).filter((name) => /^\d+$/.test(name)).sort();
  await Promise.all(entries.slice(0, -keep).map((name) => rm(join(dir, name), { recursive: true, force: true })));
}

function isIgnored(filename: string): boolean {
  if (CONFIG_COPY_PATTERN.test(filename)) return true;
  return relative('.', filename)
    .split(sep)
    .some((segment) => IGNORED_SEGMENTS.has(segment));
}
