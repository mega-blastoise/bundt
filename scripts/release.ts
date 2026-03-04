#!/usr/bin/env bun

/**
 * Unified release pipeline: build → typecheck → prerelease-check → commit → tag → publish.
 *
 * Usage:
 *   bun scripts/release.ts --package @bundt/cleo
 *   bun scripts/release.ts --package @bundt/dxdocs --tag alpha --skip-publish
 *   bun scripts/release.ts --package @bundt/cleo --dry-run
 */

import cac from 'cac';
import { resolve, join, relative } from 'path';
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

function exec(cmd: string[], options?: { cwd?: string; label?: string }): boolean {
  const label = options?.label ?? cmd.join(' ');
  const result = Bun.spawnSync(cmd, {
    cwd: options?.cwd ?? ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  if (result.exitCode !== 0) {
    console.error(pc.red(`  ✗ ${label}`));
    const stderr = result.stderr.toString().trim();
    const stdout = result.stdout.toString().trim();
    if (stderr) console.error(pc.dim(stderr));
    if (stdout) console.error(pc.dim(stdout));
    return false;
  }

  console.log(pc.green(`  ✓ ${label}`));
  return true;
}

function step(name: string) {
  console.log();
  console.log(pc.bold(pc.cyan(`▸ ${name}`)));
}

// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------

function stageBuild(packageName: string): boolean {
  step('Build');
  return exec(['turbo', 'run', 'build', `--filter=${packageName}`], {
    label: `turbo run build --filter=${packageName}`
  });
}

function stageTypecheck(packageName: string): boolean {
  step('Typecheck');
  return exec(['turbo', 'run', 'typecheck', `--filter=${packageName}`], {
    label: `turbo run typecheck --filter=${packageName}`
  });
}

function stagePrereleaseCheck(packageName: string): boolean {
  step('Prerelease Check');
  return exec(['bun', 'scripts/prerelease-check.ts', '--package', packageName], {
    label: `prerelease-check --package ${packageName}`
  });
}

function stageCommit(packageName: string, version: string, packageDir: string): boolean {
  step('Commit');

  const relDir = relative(ROOT, packageDir);

  // Stage the package directory (covers package.json, src/cli.ts, CHANGELOG.md)
  if (!exec(['git', 'add', relDir], { label: `git add ${relDir}` })) return false;

  // Check if there are staged changes
  const status = Bun.spawnSync(['git', 'diff', '--cached', '--name-only'], {
    cwd: ROOT,
    stdout: 'pipe'
  });
  const stagedFiles = status.stdout.toString().trim();

  if (!stagedFiles) {
    console.log(pc.yellow('  No changes to commit'));
    return true;
  }

  const message = `release(${packageName}): v${version}`;
  return exec(['git', 'commit', '-m', message], { label: `git commit: ${message}` });
}

function stageTag(packageName: string, version: string): boolean {
  step('Tag');

  const tag = `${packageName}@${version}`;
  return exec(['git', 'tag', '-a', tag, '-m', `release: ${tag}`], { label: `git tag ${tag}` });
}

function stagePublish(packageDir: string, tag: string): boolean {
  step('Publish');

  const args = ['npm', 'publish', '--access', 'public'];
  if (tag !== 'latest') {
    args.push('--tag', tag);
  }

  return exec(args, {
    cwd: packageDir,
    label: args.join(' ')
  });
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface ReleaseOptions {
  package?: string;
  tag?: string;
  skipPublish?: boolean;
  skipCommit?: boolean;
  dryRun?: boolean;
}

const cli = cac('release');

cli
  .command('', 'Build, validate, commit, tag, and publish a package')
  .option('--package <name>', 'Package name (e.g. @bundt/cleo) or path (e.g. apps/cleo)')
  .option('--tag <tag>', 'npm dist-tag (latest, alpha, beta, rc)', { default: 'latest' })
  .option('--skip-publish', 'Skip npm publish step')
  .option('--skip-commit', 'Skip git commit and tag steps')
  .option('--dry-run', 'Run all checks but do not commit, tag, or publish')
  .action((options: ReleaseOptions) => {
    if (!options.package) {
      cli.outputHelp();
      process.exit(1);
    }

    const packageDir = resolvePackageDir(options.package);
    const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
    const packageName: string = pkg.name;
    const version: string = pkg.version;
    const npmTag = options.tag ?? 'latest';
    const dryRun = options.dryRun ?? false;
    const skipPublish = options.skipPublish ?? false;
    const skipCommit = options.skipCommit ?? false;

    console.log(pc.bold(`Release: ${packageName}@${version}`));
    console.log(pc.dim(`  tag: ${npmTag}  dry-run: ${dryRun}  skip-publish: ${skipPublish}  skip-commit: ${skipCommit}`));

    // Verify clean working tree (only staged changes in our package are ok)
    const dirtyCheck = Bun.spawnSync(
      ['git', 'diff', '--name-only'],
      { cwd: ROOT, stdout: 'pipe' }
    );
    const dirtyFiles = dirtyCheck.stdout
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);

    const relDir = relative(ROOT, packageDir);
    const externalDirty = dirtyFiles.filter((f) => !f.startsWith(relDir + '/') && f !== relDir);
    if (externalDirty.length > 0) {
      console.log();
      console.log(pc.yellow('Warning: unstaged changes outside package directory:'));
      for (const f of externalDirty) {
        console.log(pc.dim(`  ${f}`));
      }
      console.log(pc.yellow('These will NOT be included in the release commit.'));
    }

    // 1. Build
    if (!stageBuild(packageName)) {
      console.log(pc.red('\nRelease aborted: build failed'));
      process.exit(1);
    }

    // 2. Typecheck
    if (!stageTypecheck(packageName)) {
      console.log(pc.red('\nRelease aborted: typecheck failed'));
      process.exit(1);
    }

    // 3. Prerelease check
    if (!stagePrereleaseCheck(packageName)) {
      console.log(pc.red('\nRelease aborted: prerelease check failed'));
      process.exit(1);
    }

    // 4. Commit + Tag
    if (!dryRun && !skipCommit) {
      if (!stageCommit(packageName, version, packageDir)) {
        console.log(pc.red('\nRelease aborted: commit failed'));
        process.exit(1);
      }

      if (!stageTag(packageName, version)) {
        console.log(pc.red('\nRelease aborted: tag failed'));
        process.exit(1);
      }
    } else if (dryRun) {
      step('Commit (skipped — dry run)');
      console.log(pc.dim(`  would commit: release(${packageName}): v${version}`));
      step('Tag (skipped — dry run)');
      console.log(pc.dim(`  would tag: ${packageName}@${version}`));
    }

    // 5. Publish
    if (!dryRun && !skipPublish) {
      if (!stagePublish(packageDir, npmTag)) {
        console.log(pc.red('\nRelease failed: publish failed'));
        console.log(pc.yellow('Note: commit and tag were created. You may want to:'));
        console.log(pc.dim(`  git tag -d ${packageName}@${version}`));
        console.log(pc.dim(`  git reset --soft HEAD~1`));
        process.exit(1);
      }
    } else if (dryRun) {
      step('Publish (skipped — dry run)');
      console.log(pc.dim(`  would publish to npm with --tag ${npmTag}`));
    } else if (skipPublish) {
      step('Publish (skipped)');
    }

    // Done
    console.log();
    if (dryRun) {
      console.log(pc.yellow('Dry run complete — no changes made'));
    } else {
      console.log(pc.green(`Released ${packageName}@${version}`));
      if (!skipCommit) {
        console.log(pc.dim(`  commit: release(${packageName}): v${version}`));
        console.log(pc.dim(`  tag:    ${packageName}@${version}`));
      }
      if (!skipPublish) {
        console.log(pc.dim(`  npm:    ${npmTag}`));
      }
      if (!skipPublish) {
        console.log();
        console.log(pc.dim('To push: git push && git push --tags'));
      }
    }
  });

cli.help();
cli.parse();
