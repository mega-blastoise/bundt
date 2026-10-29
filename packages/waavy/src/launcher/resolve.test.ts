import { describe, expect, test } from 'bun:test';

import { BINARY_PATH_ENV, BinaryNotFoundError, resolveBinary, type ResolveContext } from './resolve';

/** A context for darwin-arm64 where nothing is installed. */
function context(overrides: Partial<ResolveContext> = {}): ResolveContext {
  return {
    env: {},
    os: 'darwin',
    cpu: 'arm64',
    resolveModule: (specifier) => {
      throw new Error(`Cannot find module '${specifier}'`);
    },
    fileExists: () => false,
    ...overrides
  };
}

function messageOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(BinaryNotFoundError);
    return (error as Error).message;
  }
  throw new Error('expected resolveBinary to throw');
}

describe('resolveBinary', () => {
  test('WAAVY_BINARY_PATH wins over the platform package', () => {
    const path = resolveBinary(
      context({
        env: { [BINARY_PATH_ENV]: '/opt/waavy' },
        fileExists: (candidate) => candidate === '/opt/waavy',
        resolveModule: () => '/node_modules/@bundt/waavy-darwin-arm64/bin/waavy'
      })
    );
    expect(path).toBe('/opt/waavy');
  });

  test('a WAAVY_BINARY_PATH that does not exist is an error, not a silent fallback', () => {
    expect(messageOf(() => resolveBinary(context({ env: { [BINARY_PATH_ENV]: '/nope' } })))).toContain('/nope');
  });

  test('an empty WAAVY_BINARY_PATH is ignored', () => {
    const path = resolveBinary(context({ env: { [BINARY_PATH_ENV]: '' }, resolveModule: (specifier) => `/nm/${specifier}` }));
    expect(path).toBe('/nm/@bundt/waavy-darwin-arm64/bin/waavy');
  });

  test('resolves the platform package binary, with .exe on Windows', () => {
    const seen: string[] = [];
    const resolveModule = (specifier: string) => {
      seen.push(specifier);
      return `/nm/${specifier}`;
    };
    resolveBinary(context({ resolveModule }));
    resolveBinary(context({ os: 'linux', cpu: 'x64', resolveModule }));
    resolveBinary(context({ os: 'win32', cpu: 'x64', resolveModule }));
    expect(seen).toEqual([
      '@bundt/waavy-darwin-arm64/bin/waavy',
      '@bundt/waavy-linux-x64/bin/waavy',
      '@bundt/waavy-win32-x64/bin/waavy.exe'
    ]);
  });

  test('a missing platform package mentions optional dependencies and the override', () => {
    const message = messageOf(() => resolveBinary(context()));
    expect(message).toContain('@bundt/waavy-darwin-arm64 is not installed');
    expect(message).toContain('--omit=optional');
    expect(message).toContain('--no-optional');
    expect(message).toContain(BINARY_PATH_ENV);
    expect(message).toContain('linux-arm64');
  });

  test('an unsupported platform lists the supported ones and points musl users to releases', () => {
    const message = messageOf(() => resolveBinary(context({ os: 'freebsd', cpu: 'x64' })));
    expect(message).toContain('freebsd-x64');
    expect(message).toContain('win32-x64 (experimental)');
    expect(message).toContain('musl');
  });
});
