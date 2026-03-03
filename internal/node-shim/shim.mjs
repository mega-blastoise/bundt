/**
 * Shared Node.js shim for @bundt CLI tools.
 *
 * Usage from a bin/*.mjs file:
 *
 *   import { runWithBun } from '@bundt/internal-node-shim';
 *   runWithBun(import.meta.url, { name: 'cleo' });
 *
 * Options:
 *   - name:        Tool name for user-facing messages
 *   - nodeFallback: Path to a Node-compatible bundle to use when Bun is unavailable
 *                   (if omitted, the shim will offer to install Bun instead)
 */

import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';

function hasBun() {
  try {
    execSync('bun --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function installBun(name) {
  const platform = process.platform;

  if (platform === 'win32') {
    console.error(`\n${name} requires Bun (https://bun.sh).`);
    console.error('Install it with: powershell -c "irm bun.sh/install.ps1 | iex"');
    console.error(`\nThen re-run your ${name} command.`);
    process.exit(1);
  }

  const { confirm } = await import('@inquirer/prompts');

  const shouldInstall = await confirm({
    message: `${name} requires Bun. Install it now?`,
    default: true
  });

  if (!shouldInstall) {
    console.error('\nInstall Bun manually: curl -fsSL https://bun.sh/install | bash');
    process.exit(1);
  }

  console.error('\nInstalling Bun...\n');
  const result = spawnSync('bash', ['-c', 'curl -fsSL https://bun.sh/install | bash'], {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    console.error('\nBun installation failed. Install manually: https://bun.sh');
    process.exit(1);
  }

  const bunPaths = [
    `${process.env.HOME}/.bun/bin`,
    `${process.env.HOME}/.local/bin`
  ];

  for (const p of bunPaths) {
    if (!process.env.PATH.includes(p)) {
      process.env.PATH = `${p}:${process.env.PATH}`;
    }
  }

  if (!hasBun()) {
    console.error('\nBun was installed but is not on PATH yet.');
    console.error(`Restart your shell and re-run your ${name} command.`);
    process.exit(1);
  }

  console.error('\nBun installed successfully.\n');
}

/**
 * @param {string} importMetaUrl - The import.meta.url of the calling .mjs file
 * @param {{ name: string, nodeFallback?: string }} options
 */
export async function runWithBun(importMetaUrl, options) {
  const { name, nodeFallback } = options;
  const callerPath = fileURLToPath(importMetaUrl);
  const callerDir = dirname(callerPath);
  const tsFile = resolve(callerDir, basename(callerPath, '.mjs') + '.ts');

  if (hasBun()) {
    const result = spawnSync('bun', ['run', tsFile, ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: process.env
    });
    process.exit(result.status ?? 1);
  }

  if (nodeFallback) {
    const fallbackPath = resolve(callerDir, nodeFallback);
    await import(fallbackPath);
    return;
  }

  await installBun(name);

  const result = spawnSync('bun', ['run', tsFile, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: process.env
  });
  process.exit(result.status ?? 1);
}
