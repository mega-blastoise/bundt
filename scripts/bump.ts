#!/usr/bin/env bun

/**
 * Generic version bump for any workspace package.
 *
 * Usage:
 *   bun scripts/bump.ts --package @bundt/cleo --type patch
 *   bun scripts/bump.ts --package @bundt/dxdocs --type prerelease --preid alpha
 *   bun scripts/bump.ts --package @bundt/cleo --type minor --dry-run
 */

import cac from 'cac';
import semver from 'semver';
import { resolve, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import pc from 'picocolors';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dir, '..');

const BUMP_TYPES = [
  'patch',
  'minor',
  'major',
  'prepatch',
  'preminor',
  'premajor',
  'prerelease'
] as const;

type BumpType = (typeof BUMP_TYPES)[number];

function resolvePackageDir(nameOrPath: string): string {
  // Direct path: apps/cleo, packages/hateoas, etc.
  const asPath = resolve(ROOT, nameOrPath);
  if (existsSync(join(asPath, 'package.json'))) return asPath;

  // Scoped name: @bundt/cleo -> search workspace dirs
  const searchDirs = ['apps', 'packages', 'internal'];
  for (const dir of searchDirs) {
    const base = resolve(ROOT, dir);
    if (!existsSync(base)) continue;
    for (const entry of Bun.spawnSync(['ls', base]).stdout.toString().trim().split('\n')) {
      const candidate = join(base, entry);
      const pkgPath = join(candidate, 'package.json');
      if (!existsSync(pkgPath)) continue;
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (pkg.name === nameOrPath) return candidate;
    }
  }

  console.error(pc.red(`Could not resolve package: ${nameOrPath}`));
  process.exit(1);
}

function computeNewVersion(current: string, bump: BumpType, preid?: string): string {
  const result = semver.inc(current, bump);
  if (!result) {
    console.error(pc.red(`Failed to compute new version from ${current} with bump type ${bump}`));
    process.exit(1);
  }
  return result;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const cli = cac('bump');

cli
  .command('', 'Bump a workspace package version')
  .option('--package <name>', 'Package name (e.g. @bundt/cleo) or path (e.g. apps/cleo)')
  .option('--type <bump>', `Bump type: ${BUMP_TYPES.join(' | ')}`)
  .option('--preid <id>', 'Pre-release identifier (alpha, beta, rc)')
  .option('--dry-run', 'Show what would change without writing files')
  .action(run);

cli.help();
cli.parse();

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface BumpOptions {
  package?: string;
  type?: string;
  preid?: string;
  dryRun?: boolean;
}

function run(options: BumpOptions) {
  if (!options.package || !options.type) {
    cli.outputHelp();
    process.exit(1);
  }

  const bumpType = options.type as BumpType;
  if (!BUMP_TYPES.includes(bumpType)) {
    console.error(pc.red(`Invalid bump type: ${options.type}`));
    console.error(`Valid types: ${BUMP_TYPES.join(', ')}`);
    process.exit(1);
  }

  if (bumpType.startsWith('pre') && !options.preid) {
    console.error(pc.red('Pre-release bumps require --preid (alpha, beta, or rc)'));
    process.exit(1);
  }

  const dryRun = Boolean(options.dryRun);

  // Resolve package directory
  const packageDir = resolvePackageDir(options.package);
  const pkgJsonPath = join(packageDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  const packageName: string = pkg.name;
  const currentVersion: string = pkg.version;
  const newVersion = computeNewVersion(currentVersion, bumpType, options.preid);

  console.log(`${pc.bold(packageName)}`);
  console.log(`  ${pc.dim('current')}  ${pc.yellow(currentVersion)}`);
  console.log(`  ${pc.dim('next')}     ${pc.green(newVersion)}`);
  console.log();

  // Execute mutations
  const modified: string[] = [];

  // 1. package.json
  pkg.version = newVersion;
  if (!dryRun) writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  modified.push('package.json');

  // 2. cli.version() in source files
  for (const rel of ['src/cli.ts', 'src/cac.ts']) {
    const filePath = join(packageDir, rel);
    if (!existsSync(filePath)) continue;
    const content = readFileSync(filePath, 'utf8');
    const updated = content.replace(
      /cli\.version\(['"][^'"]*['"]\)/,
      `cli.version('${newVersion}')`
    );
    if (updated !== content) {
      if (!dryRun) writeFileSync(filePath, updated);
      modified.push(rel);
    }
  }

  // 3. CHANGELOG.md
  const changelogPath = join(packageDir, 'CHANGELOG.md');
  if (existsSync(changelogPath)) {
    const content = readFileSync(changelogPath, 'utf8');
    const date = new Date().toISOString().split('T')[0];
    const entry = `## [${newVersion}] - ${date}\n\n### Changed\n\n- Version bump to ${newVersion}\n`;

    const insertIndex = content.indexOf('\n## [');
    let updated: string;
    if (insertIndex !== -1) {
      updated =
        content.slice(0, insertIndex) + '\n' + entry + '\n' + content.slice(insertIndex + 1);
    } else {
      updated = content + '\n' + entry;
    }

    if (!dryRun) writeFileSync(changelogPath, updated);
    modified.push('CHANGELOG.md');
  }

  // Output
  if (dryRun) {
    console.log(pc.yellow('Dry run — no files modified'));
  } else {
    console.log(pc.green(`Bumped ${packageName} to ${newVersion}`));
  }

  console.log(pc.dim('Files:'));
  for (const file of modified) {
    console.log(`  ${dryRun ? pc.yellow('~') : pc.green('✓')} ${file}`);
  }

  if (!dryRun && modified.includes('CHANGELOG.md')) {
    console.log();
    console.log(pc.yellow('Edit CHANGELOG.md with actual changes before releasing'));
  }
}

