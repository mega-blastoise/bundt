import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { createDataSourceRegistry } from '../registry/data-source-registry';
import { createFragmentRegistry } from '../registry/fragment-registry';
import { resolveIntent } from './intent-resolver';

function makeFragment(id: string, name: string, tags: string[], dataKeys: Record<string, string> = {}) {
  const data: Record<string, { source: string }> = {};
  for (const [key, source] of Object.entries(dataKeys)) {
    data[key] = { source };
  }
  return {
    id,
    name,
    tags,
    props: z.object({}),
    data,
    interactions: {},
    render: () => null
  };
}

function makeDataSource(id: string, name: string, tags: string[] = []) {
  return {
    id,
    name,
    tags,
    params: z.object({}),
    returns: z.object({}),
    fetch: async () => ({})
  };
}

describe('resolveIntent', () => {
  test('selects fragments matching intent keywords', () => {
    const fragmentRegistry = createFragmentRegistry([
      makeFragment('sales-chart', 'Sales Chart', ['sales', 'chart'], { series: 'sales-data' }),
      makeFragment('user-table', 'User Table', ['users', 'table']),
      makeFragment('metrics', 'Metrics Panel', ['metrics', 'dashboard'])
    ]);
    const dataSourceRegistry = createDataSourceRegistry([
      makeDataSource('sales-data', 'Sales Data', ['sales'])
    ]);

    const result = resolveIntent(
      { description: 'Show sales chart with revenue data' },
      fragmentRegistry,
      dataSourceRegistry
    );

    expect(result.fragments.length).toBeGreaterThan(0);
    expect(result.fragments[0]!.fragmentId).toBe('sales-chart');
  });

  test('respects preferred fragments constraint', () => {
    const fragmentRegistry = createFragmentRegistry([
      makeFragment('chart-a', 'Chart A', ['chart']),
      makeFragment('chart-b', 'Chart B', ['chart']),
      makeFragment('table', 'Table', ['table'])
    ]);
    const dataSourceRegistry = createDataSourceRegistry([]);

    const result = resolveIntent(
      {
        description: 'Show a chart',
        constraints: { preferredFragments: ['chart-b'] }
      },
      fragmentRegistry,
      dataSourceRegistry
    );

    const ids = result.fragments.map((f) => f.fragmentId);
    expect(ids).toContain('chart-b');
  });

  test('respects layout constraint', () => {
    const fragmentRegistry = createFragmentRegistry([
      makeFragment('a', 'A', []),
      makeFragment('b', 'B', [])
    ]);
    const dataSourceRegistry = createDataSourceRegistry([]);

    const result = resolveIntent(
      {
        description: 'Show everything',
        constraints: { layout: 'split-vertical' }
      },
      fragmentRegistry,
      dataSourceRegistry
    );

    expect(result.layout).toBe('split-vertical');
  });

  test('auto-selects layout based on fragment count', () => {
    const fragmentRegistry = createFragmentRegistry([
      makeFragment('a', 'A', ['test']),
      makeFragment('b', 'B', ['test'])
    ]);
    const dataSourceRegistry = createDataSourceRegistry([]);

    const result = resolveIntent(
      { description: 'test' },
      fragmentRegistry,
      dataSourceRegistry
    );

    expect(result.layout).toBeDefined();
  });

  test('binds data sources when fragment declares matching source', () => {
    const fragmentRegistry = createFragmentRegistry([
      makeFragment('chart', 'Chart', ['data'], { series: 'my-source' })
    ]);
    const dataSourceRegistry = createDataSourceRegistry([
      makeDataSource('my-source', 'My Source')
    ]);

    const result = resolveIntent(
      { description: 'show data chart' },
      fragmentRegistry,
      dataSourceRegistry
    );

    expect(result.fragments[0]!.data).toBeDefined();
    expect(result.fragments[0]!.data!['series']!.source).toBe('my-source');
  });

  test('falls back to all fragments when none match', () => {
    const fragmentRegistry = createFragmentRegistry([
      makeFragment('a', 'A', []),
      makeFragment('b', 'B', [])
    ]);
    const dataSourceRegistry = createDataSourceRegistry([]);

    const result = resolveIntent(
      { description: 'xyzzy nonsense query' },
      fragmentRegistry,
      dataSourceRegistry
    );

    expect(result.fragments.length).toBeGreaterThan(0);
  });
});
