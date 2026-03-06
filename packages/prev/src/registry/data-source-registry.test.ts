import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { createDataSourceRegistry } from './data-source-registry';
import type { DataSourceDefinition } from '../types';

function makeDataSource(overrides: Partial<DataSourceDefinition> = {}): DataSourceDefinition {
  return {
    id: overrides.id ?? 'test-source',
    name: overrides.name ?? 'Test Source',
    params: z.object({ id: z.string() }),
    returns: z.object({ value: z.number() }),
    fetch: async () => ({ value: 42 }),
    ...overrides
  } as DataSourceDefinition;
}

describe('DataSourceRegistry', () => {
  test('register and get', () => {
    const registry = createDataSourceRegistry();
    registry.register(makeDataSource());
    expect(registry.get('test-source').id).toBe('test-source');
  });

  test('has returns correct values', () => {
    const registry = createDataSourceRegistry([makeDataSource()]);
    expect(registry.has('test-source')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });

  test('throws on duplicate', () => {
    const registry = createDataSourceRegistry([makeDataSource()]);
    expect(() => registry.register(makeDataSource())).toThrow('already registered');
  });

  test('throws on get for missing', () => {
    const registry = createDataSourceRegistry();
    expect(() => registry.get('missing')).toThrow('not found');
  });

  test('list returns all sources', () => {
    const registry = createDataSourceRegistry([
      makeDataSource({ id: 'a', name: 'A' }),
      makeDataSource({ id: 'b', name: 'B' })
    ]);
    expect(registry.list()).toHaveLength(2);
  });

  test('list filters by tags', () => {
    const registry = createDataSourceRegistry([
      makeDataSource({ id: 'a', name: 'A', tags: ['db'] }),
      makeDataSource({ id: 'b', name: 'B', tags: ['api'] })
    ]);
    expect(registry.list({ tags: ['db'] })).toHaveLength(1);
  });
});
