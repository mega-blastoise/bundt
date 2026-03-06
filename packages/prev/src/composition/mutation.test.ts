import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { createDataSourceRegistry } from '../registry/data-source-registry';
import { createFragmentRegistry } from '../registry/fragment-registry';
import type { Frame } from '../types';
import { createCompositionEngine } from './engine';

function setup() {
  const fragments = [
    {
      id: 'frag-a',
      name: 'Fragment A',
      props: z.object({}),
      data: {},
      interactions: {},
      render: () => null
    },
    {
      id: 'frag-b',
      name: 'Fragment B',
      props: z.object({}),
      data: { items: { source: 'source-1' } },
      interactions: { select: { payload: z.object({ id: z.string() }) } },
      render: () => null
    }
  ];

  const dataSources = [
    {
      id: 'source-1',
      name: 'Source 1',
      params: z.object({}),
      returns: z.object({}),
      fetch: async () => ({ items: [1, 2, 3] })
    }
  ];

  const fragmentRegistry = createFragmentRegistry(fragments);
  const dataSourceRegistry = createDataSourceRegistry(dataSources);
  const engine = createCompositionEngine(fragmentRegistry, dataSourceRegistry);

  return { engine, fragmentRegistry, dataSourceRegistry };
}

async function makeFrame(engine: ReturnType<typeof setup>['engine']): Promise<Frame> {
  const result = await engine.compose({
    fragments: [{ fragmentId: 'frag-a' }, { fragmentId: 'frag-b' }]
  }, 'session-1');
  return result.frame;
}

describe('Frame Mutations', () => {
  test('add mutation adds a fragment', async () => {
    const { engine } = setup();
    const frame = await makeFrame(engine);
    const data = new Map<string, Record<string, unknown>>();

    const result = await engine.mutateFrame(frame, [
      { action: 'add', fragmentId: 'frag-a' }
    ], data);

    expect(result.applied).toBe(1);
    expect(result.failed).toHaveLength(0);
    expect(result.frame.fragments).toHaveLength(3);
  });

  test('remove mutation removes a fragment', async () => {
    const { engine } = setup();
    const frame = await makeFrame(engine);
    const instanceId = frame.fragments[0]!.instanceId;
    const data = new Map<string, Record<string, unknown>>();

    const result = await engine.mutateFrame(frame, [
      { action: 'remove', instanceId }
    ], data);

    expect(result.applied).toBe(1);
    expect(result.frame.fragments).toHaveLength(1);
  });

  test('replace mutation swaps a fragment', async () => {
    const { engine } = setup();
    const frame = await makeFrame(engine);
    const instanceId = frame.fragments[0]!.instanceId;
    const data = new Map<string, Record<string, unknown>>();

    const result = await engine.mutateFrame(frame, [
      { action: 'replace', instanceId, newFragmentId: 'frag-b' }
    ], data);

    expect(result.applied).toBe(1);
    expect(result.frame.fragments.find((f) => f.instanceId === instanceId)!.fragmentId).toBe('frag-b');
  });

  test('resize mutation updates position', async () => {
    const { engine } = setup();
    const frame = await makeFrame(engine);
    const instanceId = frame.fragments[0]!.instanceId;
    const data = new Map<string, Record<string, unknown>>();

    const result = await engine.mutateFrame(frame, [
      { action: 'resize', instanceId, size: { rowSpan: 2, colSpan: 3 } }
    ], data);

    expect(result.applied).toBe(1);
    const inst = result.frame.fragments.find((f) => f.instanceId === instanceId);
    expect(inst!.position!.rowSpan).toBe(2);
    expect(inst!.position!.colSpan).toBe(3);
  });

  test('add mutation with unknown fragment fails gracefully', async () => {
    const { engine } = setup();
    const frame = await makeFrame(engine);
    const data = new Map<string, Record<string, unknown>>();

    const result = await engine.mutateFrame(frame, [
      { action: 'add', fragmentId: 'nonexistent' }
    ], data);

    expect(result.applied).toBe(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.error).toContain('not found');
  });

  test('multiple mutations execute in sequence', async () => {
    const { engine } = setup();
    const frame = await makeFrame(engine);
    const data = new Map<string, Record<string, unknown>>();

    const result = await engine.mutateFrame(frame, [
      { action: 'add', fragmentId: 'frag-a' },
      { action: 'add', fragmentId: 'frag-b' }
    ], data);

    expect(result.applied).toBe(2);
    expect(result.frame.fragments).toHaveLength(4);
  });

  test('bind mutation adds a binding', async () => {
    const { engine } = setup();
    const frame = await makeFrame(engine);
    const data = new Map<string, Record<string, unknown>>();

    const result = await engine.mutateFrame(frame, [
      {
        action: 'bind',
        source: { fragmentInstanceId: frame.fragments[1]!.instanceId, interaction: 'select', field: 'payload.id' },
        target: { fragmentInstanceId: frame.fragments[0]!.instanceId, prop: 'selectedId' }
      }
    ], data);

    expect(result.applied).toBe(1);
    expect(result.frame.bindings).toHaveLength(1);
  });

  test('unbind mutation removes a binding', async () => {
    const { engine } = setup();
    const frame = await makeFrame(engine);
    const data = new Map<string, Record<string, unknown>>();

    // First add a binding
    const addResult = await engine.mutateFrame(frame, [
      {
        action: 'bind',
        source: { fragmentInstanceId: frame.fragments[1]!.instanceId, interaction: 'select', field: 'payload.id' },
        target: { fragmentInstanceId: frame.fragments[0]!.instanceId, prop: 'selectedId' }
      }
    ], data);

    const bindingId = addResult.frame.bindings[0]!.id;

    const result = await engine.mutateFrame(addResult.frame, [
      { action: 'unbind', bindingId }
    ], data);

    expect(result.applied).toBe(1);
    expect(result.frame.bindings).toHaveLength(0);
  });
});
