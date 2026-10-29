import { describe, expect, test } from 'bun:test';

import { isWaavyError } from './errors';
import { type Manifest, parseManifest } from './manifest';

const valid: Manifest = {
  manifestVersion: 1,
  abi: 1,
  protocolVersion: 1,
  waavyVersion: '0.3.0',
  buildId: 'b1',
  publicPath: '/assets/',
  renderDefaults: { timeoutMs: 1000 },
  server: 'server/entry.js',
  pages: { home: { client: 'home-1.js', css: ['home-1.css'], preload: ['chunks/chunk-1.js'] } }
};

describe('parseManifest', () => {
  test('accepts a valid manifest', () => {
    expect(parseManifest(valid, 'm')).toEqual(valid);
  });

  test.each([
    ['absolute server path', { ...valid, server: '/etc/passwd' }],
    ['escaping server path', { ...valid, server: '../outside.js' }],
    ['backslash path', { ...valid, server: 'server\\entry.js' }],
    ['escaping asset path', { ...valid, pages: { home: { client: 'a/../../x.js', css: [], preload: [] } } }],
    ['bad page id', { ...valid, pages: { Home: valid.pages['home'] } }],
    ['missing field', { ...valid, buildId: undefined }]
  ])('rejects %s as RELEASE_INVALID', (_label, input) => {
    try {
      parseManifest(input, 'm');
      throw new Error('expected parseManifest to throw');
    } catch (error) {
      expect(isWaavyError(error) && error.code).toBe('RELEASE_INVALID');
    }
  });
});
