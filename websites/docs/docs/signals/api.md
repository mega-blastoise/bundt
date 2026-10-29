---
title: "Signals: API Reference"
description: Complete API reference for @bundt/signals — signal, computed, effect, and batch.
---

# API Reference

## `signal<T>(initialValue: T): Signal<T>`

Creates a reactive signal with an initial value.

```typescript
import { signal } from '@bundt/signals';

const name = signal('world');

// Read
console.log(name.value); // 'world'

// Write
name.value = 'bundt';
console.log(name.value); // 'bundt'
```

### Signal Interface

```typescript
type Signal<T> = {
  value: T;          // Get or set the current value
  peek(): T;         // Read without tracking (no dependency registered)
  subscribe(fn: (value: T) => void): () => void;  // Manual subscription
};
```

### `peek()`

Read the signal's value without registering a dependency. Useful inside effects where you need to read a value without re-triggering the effect when it changes:

```typescript
const a = signal(1);
const b = signal(2);

effect(() => {
  // This effect depends on `a` but NOT on `b`
  console.log(a.value + b.peek());
});
```

## `computed<T>(fn: () => T): Computed<T>`

Creates a derived value that recalculates when dependencies change.

```typescript
import { signal, computed } from '@bundt/signals';

const firstName = signal('Jane');
const lastName = signal('Doe');
const fullName = computed(() => `${firstName.value} ${lastName.value}`);

console.log(fullName.value); // 'Jane Doe'

firstName.value = 'John';
console.log(fullName.value); // 'John Doe'
```

### Computed Interface

```typescript
type Computed<T> = {
  readonly value: T;  // Get the current derived value (read-only)
  peek(): T;          // Read without tracking
};
```

### Lazy Evaluation

Computed values are lazy — they only recalculate when `.value` is accessed:

```typescript
const expensive = computed(() => {
  console.log('computing...');
  return heavyCalculation(input.value);
});

// No computation happens until:
console.log(expensive.value); // 'computing...'
```

## `effect(fn: () => void): () => void`

Creates a side effect that runs whenever its dependencies change. Returns a dispose function.

```typescript
import { signal, effect } from '@bundt/signals';

const count = signal(0);

const dispose = effect(() => {
  console.log(`Count is ${count.value}`);
});
// Logs: "Count is 0"

count.value = 1;
// Logs: "Count is 1"

dispose(); // Stop the effect

count.value = 2;
// No log — effect is disposed
```

### Cleanup

Effects can return a cleanup function that runs before the next execution:

```typescript
const userId = signal('user-1');

effect(() => {
  const id = userId.value;
  const controller = new AbortController();

  fetch(`/api/users/${id}`, { signal: controller.signal })
    .then(r => r.json())
    .then(updateUI);

  return () => controller.abort();
});
```

## `batch(fn: () => void): void`

Groups multiple signal writes into a single update cycle:

```typescript
import { signal, computed, effect, batch } from '@bundt/signals';

const a = signal(1);
const b = signal(2);
const sum = computed(() => a.value + b.value);

effect(() => {
  console.log(`Sum: ${sum.value}`);
});
// Logs: "Sum: 3"

batch(() => {
  a.value = 10;
  b.value = 20;
});
// Logs: "Sum: 30" (once, not twice)
```

Without `batch`, each write would trigger the effect independently. With `batch`, all writes are applied and dependents are notified once at the end.

## `untracked<T>(fn: () => T): T`

Executes a function without tracking any signal reads:

```typescript
import { signal, effect, untracked } from '@bundt/signals';

const a = signal(1);
const b = signal(2);

effect(() => {
  const aVal = a.value;  // tracked
  const bVal = untracked(() => b.value);  // not tracked
  console.log(aVal + bVal);
});
```

This effect only re-runs when `a` changes, not when `b` changes.
