import { describe, expect, test } from 'bun:test';

import { DEFAULT_OUT_DIR, DEFAULT_PUBLIC_PATH, DEFAULT_RENDER_TIMEOUT_MS, defineConfig, parseConfig } from './config';
import { isWaavyError } from './errors';

describe('parseConfig', () => {
  test('applies defaults', () => {
    expect(parseConfig({ pages: { home: './home.tsx' } }, 'waavy.config.ts')).toEqual({
      pages: { home: './home.tsx' },
      publicPath: DEFAULT_PUBLIC_PATH,
      outDir: DEFAULT_OUT_DIR,
      render: { timeoutMs: DEFAULT_RENDER_TIMEOUT_MS }
    });
  });

  test('accepts CDN public paths', () => {
    const config = parseConfig({ pages: { a: './a.tsx' }, publicPath: 'https://cdn.example.com/app/' }, 'c');
    expect(config.publicPath).toBe('https://cdn.example.com/app/');
  });

  test.each([
    [{}, 'pages'],
    [{ pages: {} }, 'at least one page'],
    [{ pages: { Home: './h.tsx' } }, 'pages'],
    [{ pages: { a: './a.tsx' }, publicPath: '/assets' }, 'must end with "/"'],
    [{ pages: { a: './a.tsx' }, publicPath: 'assets/' }, 'absolute path'],
    [{ pages: { a: './a.tsx' }, render: { timeoutMs: 0 } }, 'render.timeoutMs'],
    [{ pages: { a: './a.tsx' }, unknown: 1 }, 'unknown']
  ])('rejects %p', (input, fragment) => {
    try {
      parseConfig(input, 'waavy.config.ts');
      throw new Error('expected parseConfig to throw');
    } catch (error) {
      expect(isWaavyError(error) && error.code).toBe('CONFIG_INVALID');
      expect((error as Error).message).toContain('waavy.config.ts');
      expect((error as Error).message).toContain(fragment);
    }
  });
});

describe('defineConfig', () => {
  test('is an identity function', () => {
    const config = { pages: { home: './home.tsx' } };
    expect(defineConfig(config)).toBe(config);
  });
});
