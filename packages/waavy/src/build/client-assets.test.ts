import { describe, expect, test } from 'bun:test';

import { isWaavyError } from '../core/errors';
import { type ClientMetafile, pageAssetsFromMetafile } from './client-assets';

const cwd = '/project';
const entries = new Map([
  ['home', '/project/node_modules/.cache/waavy/build/b1/client/home.tsx'],
  ['account/settings', '/project/node_modules/.cache/waavy/build/b1/client/account/settings.tsx']
]);

/** Shaped like a real Bun metafile (see spikes/P1_SPIKES.md, S2). */
const metafile: ClientMetafile = {
  outputs: {
    '././home-abc.js': {
      entryPoint: 'node_modules/.cache/waavy/build/b1/client/home.tsx',
      cssBundle: '././home-def.css',
      imports: [
        { path: './chunks/chunk-1.js', kind: 'import-statement' },
        { path: './chunks/lazy.js', kind: 'dynamic-import' }
      ]
    },
    '././home-def.css': { entryPoint: 'node_modules/.cache/waavy/build/b1/client/home.tsx', imports: [] },
    './account/settings-xyz.js': {
      entryPoint: 'node_modules/.cache/waavy/build/b1/client/account/settings.tsx',
      imports: [{ path: './chunks/chunk-2.js', kind: 'import-statement' }]
    },
    './chunks/chunk-1.js': { imports: [{ path: './chunks/chunk-2.js', kind: 'import-statement' }] },
    './chunks/chunk-2.js': { imports: [{ path: './chunks/chunk-1.js', kind: 'import-statement' }] },
    './chunks/lazy.js': { imports: [] }
  }
};

describe('pageAssetsFromMetafile', () => {
  test('maps each page to its entry, css, and transitive static imports', () => {
    expect(pageAssetsFromMetafile(metafile, entries, cwd)).toEqual({
      home: { client: 'home-abc.js', css: ['home-def.css'], preload: ['chunks/chunk-1.js', 'chunks/chunk-2.js'] },
      'account/settings': {
        client: 'account/settings-xyz.js',
        css: [],
        preload: ['chunks/chunk-2.js', 'chunks/chunk-1.js']
      }
    });
  });

  test('fails when a page has no output', () => {
    const missing = new Map([['ghost', '/project/ghost.tsx']]);
    try {
      pageAssetsFromMetafile(metafile, missing, cwd);
      throw new Error('expected pageAssetsFromMetafile to throw');
    } catch (error) {
      expect(isWaavyError(error) && error.code).toBe('BUILD_FAILED');
    }
  });
});
