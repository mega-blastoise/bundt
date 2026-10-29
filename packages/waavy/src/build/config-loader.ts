/**
 * Locating, importing, and resolving `waavy.config.*`.
 *
 * Paths in the config (`pages`, `outDir`) are relative to the directory that
 * contains the config file; this module resolves them to absolute paths and
 * checks that every page module exists, so later build steps can rely on
 * them.
 */

import { copyFile, rm, stat } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseConfig, type WaavyConfig } from '../core/config';
import { describeError, WaavyError } from '../core/errors';

/** Config file names searched for, in priority order. */
export const CONFIG_FILE_NAMES = ['waavy.config.ts', 'waavy.config.mts', 'waavy.config.js', 'waavy.config.mjs'] as const;

/** A page registered in the config, with its module path resolved. */
export type ResolvedPage = {
  id: string;
  /** Absolute path of the page module. */
  file: string;
};

/** A validated config with every path made absolute. */
export type LoadedConfig = {
  /** Absolute path of the config file. */
  configPath: string;
  /** Directory containing the config file; the base for relative paths. */
  projectRoot: string;
  config: WaavyConfig;
  pages: readonly ResolvedPage[];
  /** Absolute release output directory. */
  outDir: string;
};

/** Where to look for the config. */
export type LoadConfigOptions = {
  /** Directory searched for `waavy.config.*` when `configPath` is not given. */
  root: string;
  /** Explicit config file; relative paths resolve against `root`. */
  configPath?: string;
  /**
   * Bypass the module cache so edits to the config file are picked up
   * (`waavy serve --dev`). Modules the config itself imports stay cached.
   */
  fresh?: boolean;
};

/**
 * Loads and resolves the project's waavy config.
 *
 * @throws {WaavyError} `CONFIG_INVALID` when the file is missing, cannot be
 *   imported, fails validation, or references a page module that does not exist.
 */
export async function loadConfig(options: LoadConfigOptions): Promise<LoadedConfig> {
  const configPath = await findConfigFile(options);
  const config = parseConfig(await importConfig(configPath, options.fresh ?? false), configPath);
  const projectRoot = dirname(configPath);

  const pages: ResolvedPage[] = [];
  for (const [id, modulePath] of Object.entries(config.pages)) {
    const file = resolve(projectRoot, modulePath);
    if (!(await isFile(file))) {
      throw new WaavyError('CONFIG_INVALID', `Page "${id}" points to ${file}, which does not exist`, { page: id });
    }
    pages.push({ id, file });
  }

  return { configPath, projectRoot, config, pages, outDir: resolve(projectRoot, config.outDir) };
}

async function findConfigFile(options: LoadConfigOptions): Promise<string> {
  const root = resolve(options.root);
  if (options.configPath !== undefined) {
    const explicit = isAbsolute(options.configPath) ? options.configPath : join(root, options.configPath);
    if (await isFile(explicit)) return explicit;
    throw new WaavyError('CONFIG_INVALID', `Config file ${explicit} does not exist`);
  }
  for (const name of CONFIG_FILE_NAMES) {
    const candidate = join(root, name);
    if (await isFile(candidate)) return candidate;
  }
  throw new WaavyError('CONFIG_INVALID', `No ${CONFIG_FILE_NAMES.join(' / ')} found in ${root}`);
}

/**
 * Imports the config module and returns its default export.
 *
 * Bun caches modules by path and ignores query strings, so a `fresh` import
 * copies the file to a uniquely named sibling (keeping its relative imports
 * valid), imports the copy, and deletes it.
 */
async function importConfig(configPath: string, fresh: boolean): Promise<unknown> {
  const importPath = fresh ? await freshCopyOf(configPath) : configPath;
  try {
    const module = (await import(pathToFileURL(importPath).href)) as { default?: unknown };
    if (module.default === undefined) {
      throw new Error('the config module has no default export');
    }
    return module.default;
  } catch (error) {
    throw new WaavyError('CONFIG_INVALID', `Cannot load ${configPath}: ${describeError(error)}`, { cause: error });
  } finally {
    if (importPath !== configPath) await rm(importPath, { force: true });
  }
}

/** Copies `file` to `.<name>.<uuid><ext>` in the same directory. */
async function freshCopyOf(file: string): Promise<string> {
  const copy = join(dirname(file), `.${basename(file, extname(file))}.${crypto.randomUUID()}${extname(file)}`);
  await copyFile(file, copy);
  return copy;
}

async function isFile(path: string): Promise<boolean> {
  return stat(path).then(
    (stats) => stats.isFile(),
    () => false
  );
}
