import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { createDataSourceRegistry } from '../registry/data-source-registry';
import type { Frame, ServerMessage } from '../types';
import { createSubscriptionManager } from './subscription-manager';

function makeFrame(fragments: Array<{ instanceId: string; fragmentId: string; dataBindings: Record<string, { source: string; params: Record<string, unknown> }> }>): Frame {
  return {
    id: 'frame-1',
    sessionId: 'session-1',
    layout: { type: 'single', gap: '0', padding: '0', columns: 1, rows: 1, positions: new Map() },
    fragments: fragments.map((f) => ({ ...f, props: {} })),
    bindings: [],
    createdAt: Date.now()
  };
}

describe('SubscriptionManager', () => {
  test('sets up subscriptions for data sources with subscribe', () => {
    let emitCallback: ((data: unknown) => void) | null = null;
    const ds = {
      id: 'live-source',
      name: 'Live Source',
      params: z.object({}),
      returns: z.object({ value: z.number() }),
      fetch: async () => ({ value: 0 }),
      subscribe: (_params: unknown, emit: (data: unknown) => void) => {
        emitCallback = emit;
        return () => { emitCallback = null; };
      }
    };

    const registry = createDataSourceRegistry([ds]);
    const manager = createSubscriptionManager(registry);
    const frame = makeFrame([
      { instanceId: 'inst-1', fragmentId: 'frag-1', dataBindings: { live: { source: 'live-source', params: {} } } }
    ]);

    const messages: ServerMessage[] = [];
    const resolvedData = new Map<string, Record<string, unknown>>();
    manager.setupFrameSubscriptions(frame, resolvedData, (msg) => messages.push(msg));

    expect(manager.activeCount()).toBe(1);
    expect(emitCallback).not.toBeNull();

    // Simulate data push
    emitCallback!({ value: 42 });
    expect(messages).toHaveLength(1);
    expect(messages[0]!.type).toBe('subscription-update');
    if (messages[0]!.type === 'subscription-update') {
      expect(messages[0]!.fragmentInstanceId).toBe('inst-1');
      expect(messages[0]!.data).toEqual({ value: 42 });
    }

    // Check resolved data was updated
    expect(resolvedData.get('inst-1')!['live']).toEqual({ value: 42 });
  });

  test('teardownFrame cleans up subscriptions', () => {
    let unsubscribed = false;
    const ds = {
      id: 'live-source',
      name: 'Live Source',
      params: z.object({}),
      returns: z.object({}),
      fetch: async () => ({}),
      subscribe: () => () => { unsubscribed = true; }
    };

    const registry = createDataSourceRegistry([ds]);
    const manager = createSubscriptionManager(registry);
    const frame = makeFrame([
      { instanceId: 'inst-1', fragmentId: 'frag-1', dataBindings: { data: { source: 'live-source', params: {} } } }
    ]);

    manager.setupFrameSubscriptions(frame, new Map(), () => {});
    expect(manager.activeCount()).toBe(1);

    manager.teardownFrame('frame-1');
    expect(unsubscribed).toBe(true);
    expect(manager.activeCount()).toBe(0);
  });

  test('skips data sources without subscribe', () => {
    const ds = {
      id: 'static-source',
      name: 'Static Source',
      params: z.object({}),
      returns: z.object({}),
      fetch: async () => ({})
    };

    const registry = createDataSourceRegistry([ds]);
    const manager = createSubscriptionManager(registry);
    const frame = makeFrame([
      { instanceId: 'inst-1', fragmentId: 'frag-1', dataBindings: { data: { source: 'static-source', params: {} } } }
    ]);

    manager.setupFrameSubscriptions(frame, new Map(), () => {});
    expect(manager.activeCount()).toBe(0);
  });

  test('teardownAll cleans up all subscriptions', () => {
    let count = 0;
    const ds = {
      id: 'live-source',
      name: 'Live Source',
      params: z.object({}),
      returns: z.object({}),
      fetch: async () => ({}),
      subscribe: () => () => { count++; }
    };

    const registry = createDataSourceRegistry([ds]);
    const manager = createSubscriptionManager(registry);

    const frame1 = { ...makeFrame([{ instanceId: 'a', fragmentId: 'f', dataBindings: { d: { source: 'live-source', params: {} } } }]), id: 'frame-a' };
    const frame2 = { ...makeFrame([{ instanceId: 'b', fragmentId: 'f', dataBindings: { d: { source: 'live-source', params: {} } } }]), id: 'frame-b' };

    manager.setupFrameSubscriptions(frame1, new Map(), () => {});
    manager.setupFrameSubscriptions(frame2, new Map(), () => {});
    expect(manager.activeCount()).toBe(2);

    manager.teardownAll();
    expect(count).toBe(2);
    expect(manager.activeCount()).toBe(0);
  });
});
