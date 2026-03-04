import { execSync, spawnSync } from 'node:child_process';

function hasBun() {
  try {
    execSync('bun --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function installBun(name) {
  if (process.platform === 'win32') {
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

  for (const p of [`${process.env.HOME}/.bun/bin`, `${process.env.HOME}/.local/bin`]) {
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
 * @param {{ name: string, tsEntry: string }} options
 */
export async function runWithBun(options) {
  const { name, tsEntry } = options;

  if (!hasBun()) {
    await installBun(name);
  }

  const result = spawnSync('bun', ['run', tsEntry, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: process.env
  });
  process.exit(result.status ?? 1);
}
