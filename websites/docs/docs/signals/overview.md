---
title: "Signals: Overview"
description: "@bundt/signals provides reactive signal graph abstractions with automatic dependency tracking."
---

# Signals

**@bundt/signals** provides reactive signal graph abstractions — signals, computed values, and effects with automatic dependency tracking and batching.

## What Are Signals?

Signals are reactive primitives that hold a value and notify dependents when that value changes. They form the foundation of a reactive computation graph:

- **Signal** — a reactive value that can be read and written
- **Computed** — a derived value that automatically recalculates when its dependencies change
- **Effect** — a side effect that runs when its dependencies change

```typescript
import { signal, computed, effect } from '@bundt/signals';

const count = signal(0);
const doubled = computed(() => count.value * 2);

effect(() => {
  console.log(`Count: ${count.value}, Doubled: ${doubled.value}`);
});
// Logs: "Count: 0, Doubled: 0"

count.value = 5;
// Logs: "Count: 5, Doubled: 10"
```

## Key Features

- **Automatic dependency tracking** — no manual subscription management
- **Glitch-free** — computed values are always consistent, never stale
- **Batching** — multiple writes in a batch trigger a single update cycle
- **Lazy evaluation** — computed values only recalculate when read
- **No framework lock-in** — works with any UI library or standalone

## Design Goals

1. **Minimal API surface** — three primitives (`signal`, `computed`, `effect`) cover the vast majority of use cases
2. **Predictable execution** — effects run synchronously in dependency order
3. **Zero overhead for unused signals** — no global scheduler running in the background
4. **TypeScript-first** — full type inference for signal values

## When to Use Signals

Signals excel at:

- **Shared reactive state** across components or modules
- **Derived computations** that should stay in sync automatically
- **Side effects** triggered by state changes (logging, persistence, network calls)
- **Fine-grained reactivity** where you need updates to propagate to specific consumers

<Callout variant="info">
  `@bundt/signals` is designed as a standalone reactive primitive library. It can be used with React, but it's not a React state management library — it's a general-purpose reactive computation graph.
</Callout>
