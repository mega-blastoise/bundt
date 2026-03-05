/**
 * Cross-runtime spawn utilities
 * Works with both Bun and Node.js
 */

export interface SpawnOptions {
  env?: Record<string, string | undefined>;
  cwd?: string;
  stdin?: 'inherit' | 'pipe' | 'ignore';
  stdout?: 'inherit' | 'pipe' | 'ignore';
  stderr?: 'inherit' | 'pipe' | 'ignore';
}

export interface SpawnResult {
  exitCode: number;
  stdout?: string;
  stderr?: string;
}

/**
 * Spawn a process and wait for it to complete
 * Returns exit code (inherits stdio by default)
 */
export async function spawn(cmd: string[], opts: SpawnOptions = {}): Promise<number> {
  const command = cmd[0];
  const args = cmd.slice(1);

  if (command === undefined) {
    throw new Error('No command provided');
  }

  if (typeof Bun !== 'undefined') {
    const proc = Bun.spawn(cmd, {
      env: opts.env ?? process.env,
      cwd: opts.cwd ?? process.cwd(),
      stdin: opts.stdin ?? 'inherit',
      stdout: opts.stdout ?? 'inherit',
      stderr: opts.stderr ?? 'inherit'
    });
    return proc.exited;
  } else {
    const { spawn: nodeSpawn } = await import('child_process');
    return new Promise((resolve) => {
      const proc = nodeSpawn(command, args, {
        env: opts.env as NodeJS.ProcessEnv,
        cwd: opts.cwd,
        stdio: [opts.stdin ?? 'inherit', opts.stdout ?? 'inherit', opts.stderr ?? 'inherit']
      });
      proc.on('close', (code) => resolve(code ?? 1));
    });
  }
}

/**
 * Spawn a process and capture its output
 * Returns stdout/stderr as strings
 */
export async function spawnCapture(
  cmd: string[],
  opts: Omit<SpawnOptions, 'stdout' | 'stderr'> = {}
): Promise<SpawnResult> {
  const command = cmd[0];
  const args = cmd.slice(1);

  if (command === undefined) {
    throw new Error('No command provided');
  }

  if (typeof Bun !== 'undefined') {
    const proc = Bun.spawn(cmd, {
      env: opts.env ?? process.env,
      cwd: opts.cwd,
      stdin: opts.stdin ?? 'ignore',
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited
    ]);

    return { exitCode, stdout, stderr };
  } else {
    const { spawn: nodeSpawn } = await import('child_process');
    return new Promise((resolve) => {
      const proc = nodeSpawn(command, args, {
        env: opts.env as NodeJS.ProcessEnv,
        cwd: opts.cwd,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({ exitCode: code ?? 1, stdout, stderr });
      });
    });
  }
}

/**
 * Check if a command exists in PATH
 */
export async function commandExists(cmd: string): Promise<boolean> {
  try {
    const result = await spawnCapture(process.platform === 'win32' ? ['where', cmd] : ['which', cmd]);
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Get the version of a command (assumes --version flag)
 */
export async function getCommandVersion(cmd: string): Promise<string | null> {
  try {
    const result = await spawnCapture([cmd, '--version']);
    if (result.exitCode === 0 && result.stdout) {
      return result.stdout.trim().split('\n')[0] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}
