import type { DataSourceRegistry } from '../registry/data-source-registry';
import type { ActiveSubscription, Frame, ServerMessage } from '../types';

export interface SubscriptionManager {
  setupFrameSubscriptions(
    frame: Frame,
    resolvedData: Map<string, Record<string, unknown>>,
    broadcast: (msg: ServerMessage) => void
  ): void;
  teardownFrame(frameId: string): void;
  teardownAll(): void;
  activeCount(): number;
}

export function createSubscriptionManager(dataSourceRegistry: DataSourceRegistry): SubscriptionManager {
  const subscriptions = new Map<string, ActiveSubscription[]>();

  function setupFrameSubscriptions(
    frame: Frame,
    resolvedData: Map<string, Record<string, unknown>>,
    broadcast: (msg: ServerMessage) => void
  ): void {
    const frameSubs: ActiveSubscription[] = [];

    for (const instance of frame.fragments) {
      for (const [dataKey, binding] of Object.entries(instance.dataBindings)) {
        if (!dataSourceRegistry.has(binding.source)) continue;
        const ds = dataSourceRegistry.get(binding.source);
        if (!ds.subscribe) continue;

        const unsubscribe = ds.subscribe(binding.params, (data) => {
          const existing = resolvedData.get(instance.instanceId) ?? {};
          existing[dataKey] = data;
          resolvedData.set(instance.instanceId, existing);

          broadcast({
            type: 'subscription-update',
            fragmentInstanceId: instance.instanceId,
            dataKey,
            data
          });
        });

        frameSubs.push({
          dataSourceId: binding.source,
          params: binding.params,
          fragmentInstanceId: instance.instanceId,
          dataKey,
          unsubscribe
        });
      }
    }

    if (frameSubs.length > 0) {
      subscriptions.set(frame.id, frameSubs);
    }
  }

  function teardownFrame(frameId: string): void {
    const subs = subscriptions.get(frameId);
    if (!subs) return;
    for (const sub of subs) {
      sub.unsubscribe();
    }
    subscriptions.delete(frameId);
  }

  function teardownAll(): void {
    for (const [frameId] of subscriptions) {
      teardownFrame(frameId);
    }
  }

  function activeCount(): number {
    let count = 0;
    for (const subs of subscriptions.values()) {
      count += subs.length;
    }
    return count;
  }

  return { setupFrameSubscriptions, teardownFrame, teardownAll, activeCount };
}
