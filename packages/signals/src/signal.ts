import type { Signal } from './graph';
import { track, notify, startBatch, endBatch } from './graph';

export function createSignal<T>(
  initialValue: T
): [get: () => T, set: (value: T | ((prev: T) => T)) => void] {
  const signal: Signal<T> = {
    kind: 'signal',
    value: initialValue,
    subscribers: new Set()
  };

  const get = (): T => {
    track(signal as Signal<unknown>);
    return signal.value;
  };

  const set = (value: T | ((prev: T) => T)): void => {
    const nextValue =
      typeof value === 'function'
        ? (value as (prev: T) => T)(signal.value)
        : value;

    if (Object.is(signal.value, nextValue)) return;

    signal.value = nextValue;
    notify(signal as Signal<unknown>);
  };

  return [get, set];
}

export function batch(fn: () => void): void {
  startBatch();
  try {
    fn();
  } finally {
    endBatch();
  }
}
