#!/usr/bin/env bun

/**
 * Generic prerelease validation for any workspace package.
 *
 * Usage:
 *   bun scripts/prerelease-check.ts --package @bundt/cleo
 *   bun scripts/prerelease-check.ts --package apps/dxdocs
 */

import cac from 'cac';
import { resolve, join } from 'path';
import { readFileSync, existsSync, readdirSync } from 'fs';
import pc from 'picocolors';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dir, '..');

function resolvePackageDir(nameOrPath: string): string {
  const asPath = resolve(ROOT, nameOrPath);
  if (existsSync(join(asPath, 'package.json'))) return asPath;

  const searchDirs = ['apps', 'packages', 'internal'];
  for (const dir of searchDirs) {
    const base = resolve(ROOT, dir);
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base)) {
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

// ---------------------------------------------------------------------------
// Check runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function pass(msg: string) {
  console.log(`  ${pc.green('✓')} ${msg}`);
  passed++;
}

function fail(msg: string) {
  console.log(`  ${pc.red('✗')} ${msg}`);
  failed++;
}

function section(title: string) {
  console.log();
  console.log(pc.yellow(`━━━ ${title} ━━━`));
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function checkBuild(packageDir: string, pkg: Record<string, unknown>) {
  section('Build');

  const distDir = join(packageDir, 'dist');
  if (existsSync(distDir)) {
    pass('dist/ exists');
  } else {
    fail("dist/ missing — run 'bun run build'");
    return; // skip further dist checks
  }

  // Check that export entry points resolve to real files
  const exports = pkg.exports as Record<string, unknown> | undefined;
  if (exports) {
    for (const [key, value] of Object.entries(exports)) {
      if (typeof value === 'string') {
        const target = join(packageDir, value);
        if (existsSync(target)) pass(`exports["${key}"] -> ${value}`);
        else fail(`exports["${key}"] -> ${value} (missing)`);
      } else if (typeof value === 'object' && value !== null) {
        const conditions = value as Record<string, string>;
        // Check the first non-types condition
        const firstEntry = Object.entries(conditions).find(([k]) => k !== 'types');
        if (firstEntry) {
          const target = join(packageDir, firstEntry[1]);
          if (existsSync(target)) pass(`exports["${key}"].${firstEntry[0]} -> ${firstEntry[1]}`);
          else fail(`exports["${key}"].${firstEntry[0]} -> ${firstEntry[1]} (missing)`);
        }
        // Check types if present
        if (conditions.types) {
          const target = join(packageDir, conditions.types);
          if (existsSync(target)) pass(`exports["${key}"].types -> ${conditions.types}`);
          else fail(`exports["${key}"].types -> ${conditions.types} (missing)`);
        }
      }
    }
  }
}

function checkEntryPoints(packageDir: string, pkg: Record<string, unknown>) {
  section('Entry Points');

  const bin = pkg.bin as Record<string, string> | undefined;
  if (!bin || Object.keys(bin).length === 0) {
    pass('No bin entries (library package)');
    return;
  }

  pass(`${Object.keys(bin).length} bin entry/entries defined`);

  for (const [name, path] of Object.entries(bin)) {
    const target = join(packageDir, path);
    if (existsSync(target)) pass(`bin.${name} -> ${path}`);
    else fail(`bin.${name} -> ${path} (missing)`);
  }
}

function checkMetadata(pkg: Record<string, unknown>) {
  section('Package Metadata');

  const name = pkg.name as string | undefined;
  if (name?.startsWith('@bundt/')) pass(`name: ${name}`);
  else fail(`name should be @bundt/ scoped (got: ${name})`);

  const version = pkg.version as string | undefined;
  if (version) pass(`version: ${version}`);
  else fail('version not set');

  const isPrivate = pkg.private as boolean | undefined;
  if (!isPrivate) pass('not marked private');
  else fail('package is marked private — remove before publishing');

  if (pkg.license) pass(`license: ${pkg.license}`);
  else fail('license not set');

  if (pkg.description) pass('description set');
  else fail('description missing');

  const files = pkg.files as string[] | undefined;
  if (files && files.length > 0) pass(`files: [${files.join(', ')}]`);
  else fail('files array missing — package may publish too much');

  if (pkg.engines) pass('engines set');
  else fail('engines missing');
}

function checkRequiredFiles(packageDir: string) {
  section('Required Files');

  for (const file of ['LICENSE', 'README.md', 'CHANGELOG.md']) {
    if (existsSync(join(packageDir, file))) pass(file);
    else fail(`${file} missing`);
  }
}

async function checkNpmPack(packageDir: string) {
  section('npm Pack');

  const result = Bun.spawnSync(['npm', 'pack', '--dry-run'], {
    cwd: packageDir,
    stderr: 'pipe',
    stdout: 'pipe'
  });

  if (result.exitCode === 0) {
    pass('npm pack --dry-run succeeded');
    const output = result.stderr.toString();

    const sizeMatch = output.match(/package size:\s*(.+)/);
    if (sizeMatch) pass(`package size: ${sizeMatch[1]}`);

    const filesMatch = output.match(/total files:\s*(\d+)/);
    if (filesMatch) pass(`total files: ${filesMatch[1]}`);
  } else {
    fail('npm pack --dry-run failed');
    console.log(pc.dim(result.stderr.toString()));
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const cli = cac('prerelease-check');

cli
  .command('', 'Validate a package is ready for release')
  .option('--package <name>', 'Package name (e.g. @bundt/cleo) or path (e.g. apps/cleo)')
  .action(async (options: { package?: string }) => {
    if (!options.package) {
      cli.outputHelp();
      process.exit(1);
    }

    const packageDir = resolvePackageDir(options.package);
    const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));

    console.log(pc.bold(`Prerelease check: ${pkg.name}@${pkg.version}`));

    checkBuild(packageDir, pkg);
    checkEntryPoints(packageDir, pkg);
    checkMetadata(pkg);
    checkRequiredFiles(packageDir);
    await checkNpmPack(packageDir);

    // Summary
    section('Summary');
    console.log();
    console.log(`  Passed: ${pc.green(String(passed))}`);
    console.log(`  Failed: ${pc.red(String(failed))}`);
    console.log();

    if (failed === 0) {
      console.log(pc.green('All checks passed! Ready for release.'));
    } else {
      console.log(pc.red('Some checks failed. Fix before releasing.'));
      process.exit(1);
    }
  });

cli.help();
cli.parse();
