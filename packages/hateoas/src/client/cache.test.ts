import { describe, expect, test } from 'bun:test';
import { createCache } from './cache.ts';
import type { HypermediaResource } from '../types.ts';

function mockResource(uri: string): HypermediaResource {
  return {
    uri,
    properties: { id: uri },
    links: [{ href: uri, rel: 'self' }],
    actions: [],
    embedded: {}
  };
}

describe('Resource Cache', () => {
  test('stores and retrieves entries', () => {
    const cache = createCache();
    cache.set('/a', {
      resource: mockResource('/a'),
      etag: '"abc"',
      timestamp: Date.now()
    });

    const entry = cache.get('/a');
    expect(entry).toBeDefined();
    expect(entry!.resource.uri).toBe('/a');
  });

  test('returns undefined for missing entries', () => {
    const cache = createCache();
    expect(cache.get('/missing')).toBeUndefined();
  });

  test('invalidates by URI', () => {
    const cache = createCache();
    cache.set('/a', { resource: mockResource('/a'), timestamp: Date.now() });
    cache.invalidate('/a');
    expect(cache.get('/a')).toBeUndefined();
  });

  test('invalidates by pattern', () => {
    const cache = createCache();
    cache.set('/api/tasks/1', { resource: mockResource('/api/tasks/1'), timestamp: Date.now() });
    cache.set('/api/tasks/2', { resource: mockResource('/api/tasks/2'), timestamp: Date.now() });
    cache.set('/api/users/1', { resource: mockResource('/api/users/1'), timestamp: Date.now() });

    cache.invalidatePattern(/\/api\/tasks\//);
    expect(cache.get('/api/tasks/1')).toBeUndefined();
    expect(cache.get('/api/tasks/2')).toBeUndefined();
    expect(cache.get('/api/users/1')).toBeDefined();
  });

  test('expires entries by maxAge', async () => {
    const cache = createCache();
    cache.set('/a', {
      resource: mockResource('/a'),
      maxAge: 0, // Expires immediately
      timestamp: Date.now() - 1000
    });

    expect(cache.get('/a')).toBeUndefined();
  });

  test('provides conditional headers', () => {
    const cache = createCache();
    cache.set('/a', {
      resource: mockResource('/a'),
      etag: '"v1"',
      lastModified: 'Thu, 01 Jan 2024 00:00:00 GMT',
      timestamp: Date.now()
    });

    const headers = cache.conditionalHeaders('/a');
    expect(headers['If-None-Match']).toBe('"v1"');
    expect(headers['If-Modified-Since']).toBe('Thu, 01 Jan 2024 00:00:00 GMT');
  });

  test('evicts oldest entries when over capacity', () => {
    const cache = createCache(3);
    cache.set('/a', { resource: mockResource('/a'), timestamp: 1 });
    cache.set('/b', { resource: mockResource('/b'), timestamp: 2 });
    cache.set('/c', { resource: mockResource('/c'), timestamp: 3 });
    cache.set('/d', { resource: mockResource('/d'), timestamp: 4 });

    expect(cache.get('/a')).toBeUndefined();
    expect(cache.get('/d')).toBeDefined();
  });

  test('clears all entries', () => {
    const cache = createCache();
    cache.set('/a', { resource: mockResource('/a'), timestamp: Date.now() });
    cache.set('/b', { resource: mockResource('/b'), timestamp: Date.now() });
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});
