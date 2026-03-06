# @bundt/signals

Reactive signal graph abstractions — signals, computed values, and effects with automatic dependency tracking.

> **Status:** Pre-release (0.1.0). All core primitives are implemented: signals, computed, effects, batching, disposal, and topological notification. API may change before 1.0.

## Install

```bash
bun add @bundt/signals
```

## Usage

```typescript
import { createSignal, createComputed, createEffect, batch } from '@bundt/signals';

// Signals — reactive values
const [count, setCount] = createSignal(0);
const [name, setName] = createSignal('world');

// Computed — derived values (lazy, cached, auto-tracked)
const greeting = createComputed(() => `Hello ${name()}, count is ${count()}`);

// Effects — side effects that re-run when dependencies change
const dispose = createEffect(() => {
  console.log(greeting());
});
// logs: "Hello world, count is 0"

setCount(1);
// logs: "Hello world, count is 1"

setName('signals');
// logs: "Hello signals, count is 1"

// Updater function
setCount(n => n + 1);
// logs: "Hello signals, count is 2"

// Batch — coalesce multiple updates into one notification
batch(() => {
  setCount(10);
  setName('batch');
  // no effects fire during the batch
});
// logs once: "Hello batch, count is 10"

// Dispose — stop an effect and clean up subscriptions
dispose();
setCount(99); // no log — effect is disposed
```

## API

### `createSignal<T>(initialValue: T): [get, set]`

Creates a reactive value. Returns a getter/setter tuple.

- **Getter** `() => T` — reads the current value and tracks the dependency if called inside a computed or effect
- **Setter** `(value: T | ((prev: T) => T)) => void` — updates the value. Accepts a direct value or an updater function. Skips update if the new value is identical (`Object.is`)

```typescript
const [count, setCount] = createSignal(0);
count();           // 0 (tracked if inside computed/effect)
setCount(5);       // set directly
setCount(n => n + 1); // updater function
```

### `createComputed<T>(fn: () => T): () => T`

Creates a lazily-evaluated derived value. The computation function is re-run only when its tracked dependencies change, and only when the computed value is actually read.

- Dependencies are tracked automatically during execution
- Returns a getter function `() => T`
- Computed values can depend on signals and other computed values
- Re-computation is deferred until the value is next read (lazy pull)
- Old dependencies are cleared on each re-computation (dynamic tracking)

```typescript
const [a, setA] = createSignal(1);
const [b, setB] = createSignal(2);
const sum = createComputed(() => a() + b());

sum(); // 3
setA(10);
sum(); // 12
```

### `createEffect(fn: () => void | (() => void)): () => void`

Registers a side effect that runs immediately and re-runs when its tracked dependencies change. Returns a dispose function.

- Dependencies are tracked automatically during execution
- The effect function may return a cleanup function, which is called before each re-run and on disposal
- Old dependencies are cleared on each re-run (dynamic tracking)
- Disposed effects are removed from the graph and will not re-run

```typescript
const [count, setCount] = createSignal(0);

const dispose = createEffect(() => {
  console.log(`count is ${count()}`);
  return () => console.log('cleaning up');
});
// logs: "count is 0"

setCount(1);
// logs: "cleaning up"
// logs: "count is 1"

dispose();
// logs: "cleaning up"
```

### `batch(fn: () => void): void`

Batches multiple signal updates so that computed values and effects only recalculate once after the batch completes. Batches can be nested — only the outermost batch triggers notifications.

```typescript
const [a, setA] = createSignal(0);
const [b, setB] = createSignal(0);

createEffect(() => console.log(a() + b()));
// logs: 0

batch(() => {
  setA(1);
  setB(2);
});
// logs: 3 (once, not twice)
```

## Design

The signal graph uses a push/pull hybrid:

1. **Push:** When a signal is set, dirty flags propagate through the dependency graph via BFS. Effects are collected for re-execution.
2. **Pull:** Computed values are lazy — they only recompute when read and marked dirty.
3. **Topological ordering:** Effects are scheduled after all computed values in their dependency chain are re-evaluated.
4. **Dynamic tracking:** Dependencies are re-discovered on each execution. If a computed or effect conditionally reads different signals, the graph adapts automatically.

The implementation is ~200 lines across 4 files with no external dependencies.

## Graph Internals

| Node Type | Properties |
|-----------|------------|
| **Signal** | `value`, `subscribers` (set of computed/effect nodes) |
| **Computed** | `fn`, `value`, `dirty` flag, `dependencies`, `subscribers` |
| **Effect** | `fn`, `cleanup`, `dependencies`, `disposed` flag |

## License

MIT
