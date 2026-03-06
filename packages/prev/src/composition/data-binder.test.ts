import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { createDataBinder } from './data-binder';
import { createDataSourceRegistry } from '../registry/data-source-registry';
import type { DataSourceDefinition, FragmentInstance, StructuredComposition } from '../types';

function makeRegistry() {
  return createDataSourceRegistry([
    {
      id: 'users',
      name: 'Users',
      params: z.object({ limit: z.number() }),
      returns: z.array(z.object({ id: z.string(), name: z.string() })),
      fetch: async (params: { limit: number }) =>
        Array.from({ length: params.limit }, (_, i) => ({ id: `${i}`, name: `User ${i}` }))
    } as DataSourceDefinition,
    {
      id: 'user-detail',
      name: 'User Detail',
      params: z.object({ userId: z.string() }),
      returns: z.object({ id: z.string(), name: z.string(), email: z.string() }),
      fetch: async (params: { userId: string }) => ({
        id: params.userId,
        name: `User ${params.userId}`,
        email: `user${params.userId}@test.com`
      })
    } as DataSourceDefinition
  ]);
}

describe('DataBinder', () => {
  test('builds fetch plan from composition', () => {
    const binder = createDataBinder(makeRegistry());
    const composition: StructuredComposition = {
      fragments: [
        {
          fragmentId: 'list',
          data: { users: { source: 'users', params: { limit: 10 } } }
        }
      ]
    };
    const instances: FragmentInstance[] = [
      { instanceId: 'inst-1', fragmentId: 'list', props: {}, dataBindings: {} }
    ];

    const plan = binder.buildFetchPlan(composition, instances);
    expect(plan.steps).toHaveLength(1);
    expect(plan.steps[0]!.dataSourceId).toBe('users');
    expect(plan.steps[0]!.targetFragmentInstanceId).toBe('inst-1');
  });

  test('executes fetch plan and returns data', async () => {
    const binder = createDataBinder(makeRegistry());
    const plan = {
      steps: [
        {
          dataSourceId: 'users',
          params: { limit: 3 },
          targetFragmentInstanceId: 'inst-1',
          targetDataKey: 'users'
        }
      ]
    };

    const results = await binder.executeFetchPlan(plan);
    const data = results.get('inst-1');
    expect(data).toBeDefined();
    expect(data!['users']).toHaveLength(3);
  });

  test('executes multiple independent fetches in parallel', async () => {
    const binder = createDataBinder(makeRegistry());
    const plan = {
      steps: [
        {
          dataSourceId: 'users',
          params: { limit: 2 },
          targetFragmentInstanceId: 'inst-1',
          targetDataKey: 'users'
        },
        {
          dataSourceId: 'user-detail',
          params: { userId: '1' },
          targetFragmentInstanceId: 'inst-2',
          targetDataKey: 'detail'
        }
      ]
    };

    const results = await binder.executeFetchPlan(plan);
    expect(results.has('inst-1')).toBe(true);
    expect(results.has('inst-2')).toBe(true);
  });

  test('throws on unknown data source', () => {
    const binder = createDataBinder(makeRegistry());
    const composition: StructuredComposition = {
      fragments: [
        {
          fragmentId: 'list',
          data: { items: { source: 'nonexistent', params: {} } }
        }
      ]
    };
    const instances: FragmentInstance[] = [
      { instanceId: 'inst-1', fragmentId: 'list', props: {}, dataBindings: {} }
    ];

    expect(() => binder.buildFetchPlan(composition, instances)).toThrow('not found');
  });
});
