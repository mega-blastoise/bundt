import type { Computed } from './graph';
import { track, notify, setActiveObserver } from './graph';

export function createComputed<T>(fn: () => T): () => T {
  const computed: Computed<T> = {
    kind: 'computed',
    fn,
    value: undefined,
    dirty: true,
    dependencies: new Set(),
    subscribers: new Set()
  };

  const get = (): T => {
    track(computed as Computed<unknown>);

    if (computed.dirty) {
      // Clear old dependencies
      for (const dep of computed.dependencies) {
        dep.subscribers.delete(computed as Computed<unknown>);
      }
      computed.dependencies.clear();

      const prev = setActiveObserver(computed as Computed<unknown>);
      try {
        computed.value = computed.fn();
      } finally {
        setActiveObserver(prev);
      }
      computed.dirty = false;
    }

    return computed.value as T;
  };

  return get;
}
