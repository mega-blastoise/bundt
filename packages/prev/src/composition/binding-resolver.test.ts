import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { resolveBindings } from './binding-resolver';
import { createFragmentRegistry } from '../registry/fragment-registry';
import type { DataBinding, FragmentDefinition, FragmentInstance } from '../types';

function makeRegistry() {
  return createFragmentRegistry([
    {
      id: 'list',
      name: 'List',
      props: z.object({}),
      data: {},
      interactions: {
        rowSelect: { payload: z.object({ rowId: z.string() }) }
      },
      render: () => null
    } as FragmentDefinition,
    {
      id: 'detail',
      name: 'Detail',
      props: z.object({ selectedId: z.string().optional() }),
      data: {},
      interactions: {},
      render: () => null
    } as FragmentDefinition
  ]);
}

describe('resolveBindings', () => {
  test('resolves valid binding', () => {
    const instances: FragmentInstance[] = [
      { instanceId: 'inst-1', fragmentId: 'list', props: {}, dataBindings: {} },
      { instanceId: 'inst-2', fragmentId: 'detail', props: {}, dataBindings: {} }
    ];

    const bindings: DataBinding[] = [
      {
        id: 'b1',
        sourceFragmentInstanceId: 'inst-1',
        sourceInteraction: 'rowSelect',
        targetFragmentInstanceId: 'inst-2',
        targetType: 'prop',
        targetKey: 'selectedId',
        transform: 'rowId'
      }
    ];

    const resolved = resolveBindings(bindings, instances, makeRegistry());
    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.sourceFragmentId).toBe('list');
    expect(resolved[0]!.targetFragmentId).toBe('detail');
  });

  test('throws on missing source instance', () => {
    const instances: FragmentInstance[] = [
      { instanceId: 'inst-2', fragmentId: 'detail', props: {}, dataBindings: {} }
    ];
    const bindings: DataBinding[] = [
      {
        id: 'b1',
        sourceFragmentInstanceId: 'nonexistent',
        sourceInteraction: 'rowSelect',
        targetFragmentInstanceId: 'inst-2',
        targetType: 'prop',
        targetKey: 'selectedId'
      }
    ];
    expect(() => resolveBindings(bindings, instances, makeRegistry())).toThrow('source instance');
  });

  test('throws on missing interaction', () => {
    const instances: FragmentInstance[] = [
      { instanceId: 'inst-1', fragmentId: 'detail', props: {}, dataBindings: {} },
      { instanceId: 'inst-2', fragmentId: 'list', props: {}, dataBindings: {} }
    ];
    const bindings: DataBinding[] = [
      {
        id: 'b1',
        sourceFragmentInstanceId: 'inst-1',
        sourceInteraction: 'nonexistent',
        targetFragmentInstanceId: 'inst-2',
        targetType: 'prop',
        targetKey: 'title'
      }
    ];
    expect(() => resolveBindings(bindings, instances, makeRegistry())).toThrow('does not have interaction');
  });
});
