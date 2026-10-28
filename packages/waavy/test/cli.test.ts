/**
 * One-shot CLI contract (P1 T12/T13 acceptance), run against both the bundled
 * CLI (`bun dist/cli.js`) and the compiled binary (`dist/bin/waavy`):
 *
 * - stdout carries only HTML;
 * - stderr carries only JSON lines (`{"warning":…}` / `{"error":…}`);
 * - the exit code is 0 on success and `ERROR_CODES[code].exit` otherwise.
 */

import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { ERROR_CODES, type ErrorCode } from '../src/core/errors';
import { buildFixtureRelease, CLI_BINARY, CLI_BUNDLE, FIXTURE_ROOT, type FixtureRelease } from './support/fixture';

/** The executables under test; the binary is included when it has been compiled. */
const EXECUTABLES: ReadonlyArray<[label: string, command: readonly string[]]> = [
  ['bundled CLI', ['bun', CLI_BUNDLE]],
  ...(existsSync(CLI_BINARY) ? [['compiled binary', [CLI_BINARY]] as [string, string[]]] : [])
];

let fixture: FixtureRelease;
let scratch: string;

beforeAll(async () => {
  fixture = await buildFixtureRelease();
  scratch = await mkdtemp(join(tmpdir(), 'waavy-cli-'));
});
afterAll(async () => {
  await fixture.dispose();
  await rm(scratch, { recursive: true, force: true });
});

type RunResult = { exitCode: number; stdout: string; stderrLines: unknown[] };

/** Runs a command, parsing every stderr line as JSON (failing if one is not). */
async function run(command: readonly string[], args: readonly string[], stdin?: string): Promise<RunResult> {
  const child = Bun.spawn([...command, ...args], {
    stdin: stdin === undefined ? 'ignore' : new Blob([stdin]),
    stdout: 'pipe',
    stderr: 'pipe'
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text()
  ]);
  const stderrLines = stderr
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as unknown);
  return { exitCode, stdout, stderrLines };
}

/** Asserts a failed run produced exactly one error line with `code`. */
function expectFailure(result: RunResult, code: ErrorCode): void {
  expect(result.exitCode).toBe(ERROR_CODES[code].exit);
  expect(result.stdout).toBe('');
  expect(result.stderrLines).toHaveLength(1);
  expect(result.stderrLines[0]).toMatchObject({ error: { code } });
}

describe.each(EXECUTABLES)('%s', (_label, command) => {
  const render = (...args: string[]) => run(command, ['render', '--release', fixture.dir, ...args]);

  test('build loads a config that imports @bundt/waavy and writes a release', async () => {
    // Regression: compiled binaries must resolve packages via package.json (spike S1b).
    const outDir = join(scratch, `build-${crypto.randomUUID()}`);
    const child = Bun.spawn([...command, 'build', '--root', FIXTURE_ROOT, '--out', outDir], {
      stdout: 'pipe',
      stderr: 'pipe'
    });
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text()
    ]);
    expect(stderr).toBe('');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('built');
    expect(existsSync(join(outDir, 'manifest.json'))).toBe(true);
  });

  test('--version prints the package version', async () => {
    const child = Bun.spawn([...command, '--version'], { stdout: 'pipe' });
    expect(await new Response(child.stdout).text()).toContain('0.3.0');
  });

  test('buffered render: HTML on stdout, nothing on stderr', async () => {
    const result = await render('--page', 'counter', '--props', '{"label":"Hi","initial":1}', '--title', 'T');
    expect(result.exitCode).toBe(0);
    expect(result.stderrLines).toEqual([]);
    expect(result.stdout.startsWith('<!doctype html>')).toBe(true);
    expect(result.stdout).toContain('<title>T</title>');
    expect(result.stdout.endsWith('</body></html>')).toBe(true);
  });

  test('streamed render produces the same document', async () => {
    const args = ['--page', 'counter', '--props', '{"label":"Hi","initial":1}'];
    const buffered = await render(...args);
    const streamed = await render(...args, '--stream');
    expect(streamed.exitCode).toBe(0);
    expect(streamed.stdout).toBe(buffered.stdout);
  });

  test('recoverable errors become warning lines', async () => {
    const result = await render('--page', 'boundary');
    expect(result.exitCode).toBe(0);
    expect(result.stderrLines).toEqual([
      { warning: { code: 'RECOVERABLE_ERROR', page: 'boundary', reason: 'error', message: expect.any(String) } }
    ]);
  });

  test('--stdin accepts a full request', async () => {
    const request = JSON.stringify({ v: 1, page: 'counter', props: { label: 'stdin', initial: 4 } });
    const result = await run(command, ['render', '--release', fixture.dir, '--stdin'], request);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('<p id="label">stdin</p>');
  });

  test('--props-file reads large props', async () => {
    const label = 'x'.repeat(200_000);
    const file = join(scratch, `props-${crypto.randomUUID()}.json`);
    await writeFile(file, JSON.stringify({ label, initial: 0 }));
    const result = await render('--page', 'counter', '--props-file', file);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(label);
  });

  test.each([
    [['--page', 'broken'], 'RENDER_FAILED'],
    [['--page', 'missing'], 'PAGE_NOT_FOUND'],
    [['--page', 'counter', '--props', 'not json'], 'INVALID_REQUEST'],
    [['--page', 'counter', '--props', '{}', '--props-file', 'x.json'], 'INVALID_REQUEST'],
    [['--page', 'counter', '--stdin'], 'INVALID_REQUEST'],
    [['--page', 'counter', '--timeout', '0'], 'INVALID_REQUEST'],
    [['--page', 'counter', '--bogus'], 'INVALID_REQUEST'],
    [[], 'INVALID_REQUEST']
  ] as const)('%p → %s', async (args, code) => {
    expectFailure(await render(...args), code);
  });

  test('a missing release is RELEASE_INVALID', async () => {
    expectFailure(await run(command, ['render', '--release', join(scratch, 'none'), '--page', 'counter']), 'RELEASE_INVALID');
  });

  test('a shell timeout exits promptly after the deadline', async () => {
    const started = performance.now();
    const result = await render('--page', 'slow', '--timeout', '200');
    expect(result.exitCode).toBe(0);
    expect(performance.now() - started).toBeLessThan(3000);
  });
});
