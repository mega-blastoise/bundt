import { describe, test, expect } from 'bun:test';
import { createSignal, createComputed, createEffect, batch } from '../index';

describe('Signal', () => {
  test('get returns initial value', () => {
    const [get] = createSignal(42);
    expect(get()).toBe(42);
  });

  test('set updates value', () => {
    const [get, set] = createSignal(1);
    set(2);
    expect(get()).toBe(2);
  });

  test('set with function form', () => {
    const [get, set] = createSignal(10);
    set((prev) => prev + 1);
    expect(get()).toBe(11);
  });

  test('Object.is equality check skips notification', () => {
    const [get, set] = createSignal(5);
    let runs = 0;
    createEffect(() => {
      get();
      runs++;
    });
    expect(runs).toBe(1);
    set(5);
    expect(runs).toBe(1);
  });

  test('multiple independent signals', () => {
    const [getA, setA] = createSignal('a');
    const [getB, setB] = createSignal('b');
    expect(getA()).toBe('a');
    expect(getB()).toBe('b');
    setA('x');
    setB('y');
    expect(getA()).toBe('x');
    expect(getB()).toBe('y');
  });
});

describe('Computed', () => {
  test('derives from single signal', () => {
    const [get, set] = createSignal(3);
    const doubled = createComputed(() => get() * 2);
    expect(doubled()).toBe(6);
    set(5);
    expect(doubled()).toBe(10);
  });

  test('lazy: does not run fn until get() called', () => {
    const [get] = createSignal(1);
    let calls = 0;
    const comp = createComputed(() => {
      calls++;
      return get();
    });
    expect(calls).toBe(0);
    comp();
    expect(calls).toBe(1);
  });

  test('caches: calling get() twice only runs fn once if deps unchanged', () => {
    const [get] = createSignal(1);
    let calls = 0;
    const comp = createComputed(() => {
      calls++;
      return get();
    });
    comp();
    comp();
    expect(calls).toBe(1);
  });

  test('re-evaluates when dependency changes', () => {
    const [get, set] = createSignal(1);
    let calls = 0;
    const comp = createComputed(() => {
      calls++;
      return get() + 10;
    });
    expect(comp()).toBe(11);
    expect(calls).toBe(1);
    set(2);
    expect(comp()).toBe(12);
    expect(calls).toBe(2);
  });

  test('chains: computed depending on another computed', () => {
    const [get, set] = createSignal(2);
    const doubled = createComputed(() => get() * 2);
    const quadrupled = createComputed(() => doubled() * 2);
    expect(quadrupled()).toBe(8);
    set(3);
    expect(quadrupled()).toBe(12);
  });

  test('memoization across dependency change that produces same value', () => {
    const [get, set] = createSignal(2);
    let calls = 0;
    const parity = createComputed(() => {
      calls++;
      return get() % 2;
    });
    expect(parity()).toBe(0);
    expect(calls).toBe(1);
    set(4);
    expect(parity()).toBe(0);
    expect(calls).toBe(2);
  });
});

describe('Effect', () => {
  test('runs immediately on creation', () => {
    let runs = 0;
    createEffect(() => {
      runs++;
    });
    expect(runs).toBe(1);
  });

  test('re-runs when tracked signal changes', () => {
    const [get, set] = createSignal(0);
    let observed = -1;
    createEffect(() => {
      observed = get();
    });
    expect(observed).toBe(0);
    set(1);
    expect(observed).toBe(1);
    set(2);
    expect(observed).toBe(2);
  });

  test('tracks only signals read during fn execution', () => {
    const [getA, setA] = createSignal(0);
    const [getB, setB] = createSignal(0);
    let runs = 0;
    createEffect(() => {
      getA();
      runs++;
    });
    expect(runs).toBe(1);
    setA(1);
    expect(runs).toBe(2);
    setB(1);
    expect(runs).toBe(2);
  });

  test('cleanup function called before re-run', () => {
    const [get, set] = createSignal(0);
    const log: string[] = [];
    createEffect(() => {
      const val = get();
      log.push(`run:${val}`);
      return () => {
        log.push(`cleanup:${val}`);
      };
    });
    expect(log).toEqual(['run:0']);
    set(1);
    expect(log).toEqual(['run:0', 'cleanup:0', 'run:1']);
  });

  test('dispose stops tracking and future re-runs', () => {
    const [get, set] = createSignal(0);
    let runs = 0;
    const dispose = createEffect(() => {
      get();
      runs++;
    });
    expect(runs).toBe(1);
    dispose();
    set(1);
    expect(runs).toBe(1);
  });

  test('does not re-run for unrelated signal changes', () => {
    const [getA] = createSignal(0);
    const [, setB] = createSignal(0);
    let runs = 0;
    createEffect(() => {
      getA();
      runs++;
    });
    expect(runs).toBe(1);
    setB(99);
    expect(runs).toBe(1);
  });
});

describe('Batch', () => {
  test('multiple signal updates in batch only trigger effect once', () => {
    const [getA, setA] = createSignal(0);
    const [getB, setB] = createSignal(0);
    let runs = 0;
    createEffect(() => {
      getA();
      getB();
      runs++;
    });
    expect(runs).toBe(1);
    batch(() => {
      setA(1);
      setB(1);
    });
    expect(runs).toBe(2);
  });

  test('effect sees final values after batch', () => {
    const [get, set] = createSignal(0);
    let observed = -1;
    createEffect(() => {
      observed = get();
    });
    expect(observed).toBe(0);
    batch(() => {
      set(1);
      set(2);
      set(3);
    });
    expect(observed).toBe(3);
  });
});
