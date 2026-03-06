import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { createCompositionEngine } from './engine';
import { createFragmentRegistry } from '../registry/fragment-registry';
import { createDataSourceRegistry } from '../registry/data-source-registry';
import type { DataSourceDefinition, FragmentDefinition, StructuredComposition } from '../types';

function setup() {
  const fragmentRegistry = createFragmentRegistry([
    {
      id: 'chart',
      name: 'Chart',
      props: z.object({ title: z.string() }),
      data: { metrics: { source: 'metrics-api' } },
      interactions: {
        pointClick: { payload: z.object({ x: z.number(), y: z.number() }) }
      },
      render: ({ props, data }) => null
    } as FragmentDefinition,
    {
      id: 'table',
      name: 'Table',
      props: z.object({}),
      data: { rows: { source: 'metrics-api' } },
      interactions: {},
      render: ({ data }) => null
    } as FragmentDefinition
  ]);

  const dataSourceRegistry = createDataSourceRegistry([
    {
      id: 'metrics-api',
      name: 'Metrics API',
      params: z.object({}).passthrough(),
      returns: z.array(z.unknown()),
      fetch: async () => [{ x: 1, y: 100 }, { x: 2, y: 200 }]
    } as DataSourceDefinition
  ]);

  return createCompositionEngine(fragmentRegistry, dataSourceRegistry);
}

describe('CompositionEngine', () => {
  test('composes a single fragment', async () => {
    const engine = setup();
    const request: StructuredComposition = {
      fragments: [
        {
          fragmentId: 'chart',
          props: { title: 'Revenue' },
          data: { metrics: { source: 'metrics-api', params: {} } }
        }
      ]
    };

    const result = await engine.compose(request, 'session-1');
    expect(result.frame.fragments).toHaveLength(1);
    expect(result.frame.layout.type).toBe('single');
    expect(result.frame.sessionId).toBe('session-1');
    expect(result.resolvedData.size).toBe(1);
  });

  test('composes multiple fragments with layout', async () => {
    const engine = setup();
    const request: StructuredComposition = {
      fragments: [
        {
          fragmentId: 'chart',
          props: { title: 'Chart' },
          data: { metrics: { source: 'metrics-api', params: {} } }
        },
        {
          fragmentId: 'table',
          data: { rows: { source: 'metrics-api', params: {} } }
        }
      ]
    };

    const result = await engine.compose(request, 'session-1');
    expect(result.frame.fragments).toHaveLength(2);
    expect(result.frame.layout.type).toBe('split-horizontal');
    expect(result.resolvedData.size).toBe(2);
  });

  test('respects explicit layout type', async () => {
    const engine = setup();
    const request: StructuredComposition = {
      fragments: [
        { fragmentId: 'chart', props: { title: 'A' }, data: { metrics: { source: 'metrics-api', params: {} } } },
        { fragmentId: 'table', data: { rows: { source: 'metrics-api', params: {} } } }
      ],
      layout: 'split-vertical'
    };

    const result = await engine.compose(request, 'session-1');
    expect(result.frame.layout.type).toBe('split-vertical');
  });

  test('throws on unknown fragment', async () => {
    const engine = setup();
    const request: StructuredComposition = {
      fragments: [{ fragmentId: 'nonexistent' }]
    };

    await expect(engine.compose(request, 'session-1')).rejects.toThrow('not found');
  });

  test('resolves bindings', async () => {
    const engine = setup();
    const request: StructuredComposition = {
      fragments: [
        { fragmentId: 'chart', props: { title: 'A' }, data: { metrics: { source: 'metrics-api', params: {} } } },
        { fragmentId: 'table', data: { rows: { source: 'metrics-api', params: {} } } }
      ],
      bindings: [] // empty bindings still resolved
    };

    const result = await engine.compose(request, 'session-1');
    expect(result.resolvedBindings).toEqual([]);
  });

  test('assigns positions to all fragments', async () => {
    const engine = setup();
    const request: StructuredComposition = {
      fragments: [
        { fragmentId: 'chart', props: { title: 'A' }, data: { metrics: { source: 'metrics-api', params: {} } } },
        { fragmentId: 'table', data: { rows: { source: 'metrics-api', params: {} } } }
      ]
    };

    const result = await engine.compose(request, 'session-1');
    for (const fragment of result.frame.fragments) {
      expect(fragment.position).toBeDefined();
    }
  });
});
