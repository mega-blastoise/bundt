/**
 * P3 T3 acceptance: the npm launcher (`bin/waavy.js` → `dist/launcher.js`)
 * is transparent — arguments, stdio, exit codes, death by signal, and
 * forwarded signals all behave as if the binary were run directly — under
 * both Node and Bun. Fake binaries are small shell scripts, so these tests
 * run on unix-like systems only.
 */

import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { assertPackageBuilt, CLI_LAUNCHER as LAUNCHER } from './support/fixture';

/** Shell scripts standing in for the native binary. */
const FAKE_BINARIES = {
  // Echoes its arguments one per line, writes stderr, exits 7.
  echo: 'printf "%s\\n" "$@"\necho "to stderr" >&2\nexit 7\n',
  // Dies by SIGTERM.
  suicide: 'kill -TERM $$\nsleep 5\n',
  // Announces readiness, then exits 0 when it receives SIGTERM.
  trapsTerm: 'trap "echo got-term; exit 0" TERM\necho ready\nwhile :; do sleep 0.05; done\n'
} as const;

let scratch: string;
const fake = (name: keyof typeof FAKE_BINARIES) => join(scratch, name);

beforeAll(async () => {
  assertPackageBuilt();
  scratch = await mkdtemp(join(tmpdir(), 'waavy-launcher-'));
  for (const [name, body] of Object.entries(FAKE_BINARIES)) {
    const path = join(scratch, name);
    await writeFile(path, `#!/bin/sh\n${body}`, 'utf8');
    await chmod(path, 0o755);
  }
});
afterAll(() => rm(scratch, { recursive: true, force: true }));

function launch(runtime: string, binary: string, args: readonly string[] = []) {
  return Bun.spawn([runtime, LAUNCHER, ...args], {
    env: { ...process.env, WAAVY_BINARY_PATH: binary },
    stdout: 'pipe',
    stderr: 'pipe'
  });
}

describe.skipIf(process.platform === 'win32').each(['node', 'bun'])('launcher under %s', (runtime) => {
  test('passes arguments and stdio through and mirrors the exit code', async () => {
    const child = launch(runtime, fake('echo'), ['render', '--page', 'a b']);
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text()
    ]);
    expect(exitCode).toBe(7);
    expect(stdout).toBe('render\n--page\na b\n');
    expect(stderr).toBe('to stderr\n');
  });

  test('exits 128 + signal when the binary is killed by a signal', async () => {
    expect(await launch(runtime, fake('suicide')).exited).toBe(143);
  });

  test('forwards SIGTERM to the binary', async () => {
    const child = launch(runtime, fake('trapsTerm'));
    const reader = child.stdout.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toContain('ready');

    child.kill('SIGTERM');
    let rest = '';
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      rest += new TextDecoder().decode(chunk.value);
    }
    expect(rest).toContain('got-term');
    expect(await child.exited).toBe(0);
  });

  test('a missing binary is reported with exit code 127', async () => {
    const child = launch(runtime, join(scratch, 'does-not-exist'));
    const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
    expect(exitCode).toBe(127);
    expect(stderr).toContain('WAAVY_BINARY_PATH');
  });
});
