type CleanupFn = () => void;

export type Signal<T> = {
  readonly kind: 'signal';
  value: T;
  readonly subscribers: Set<Computed<unknown> | Effect>;
};

export type Computed<T> = {
  readonly kind: 'computed';
  fn: () => T;
  value: T | undefined;
  dirty: boolean;
  readonly dependencies: Set<Signal<unknown> | Computed<unknown>>;
  readonly subscribers: Set<Computed<unknown> | Effect>;
};

export type Effect = {
  readonly kind: 'effect';
  fn: () => void | CleanupFn;
  cleanup: CleanupFn | void;
  readonly dependencies: Set<Signal<unknown> | Computed<unknown>>;
  disposed: boolean;
};

type ReactiveNode = Signal<unknown> | Computed<unknown> | Effect;

let activeObserver: Computed<unknown> | Effect | null = null;
let batchDepth = 0;
const pendingEffects = new Set<Effect>();

export function getActiveObserver(): Computed<unknown> | Effect | null {
  return activeObserver;
}

export function setActiveObserver(
  observer: Computed<unknown> | Effect | null
): Computed<unknown> | Effect | null {
  const prev = activeObserver;
  activeObserver = observer;
  return prev;
}

export function track(source: Signal<unknown> | Computed<unknown>): void {
  if (activeObserver === null) return;
  source.subscribers.add(activeObserver);
  activeObserver.dependencies.add(source);
}

export function notify(source: Signal<unknown> | Computed<unknown>): void {
  const queue: ReactiveNode[] = [];
  const visited = new Set<ReactiveNode>();

  function visit(node: ReactiveNode): void {
    if (visited.has(node)) return;
    visited.add(node);

    if (node.kind === 'computed') {
      node.dirty = true;
      for (const sub of node.subscribers) {
        visit(sub);
      }
    }

    if (node.kind === 'effect' || node.kind === 'computed') {
      queue.push(node);
    }
  }

  for (const sub of source.subscribers) {
    visit(sub);
  }

  // Topological sort: process computeds before effects
  // Computeds are pulled lazily, so we only need to schedule effects
  const effects = queue.filter(
    (n): n is Effect => n.kind === 'effect' && !n.disposed
  );

  if (batchDepth > 0) {
    for (const effect of effects) {
      pendingEffects.add(effect);
    }
    return;
  }

  for (const effect of effects) {
    runEffect(effect);
  }
}

export function runEffect(effect: Effect): void {
  if (effect.disposed) return;

  // Clean up previous run
  if (effect.cleanup) {
    effect.cleanup();
    effect.cleanup = undefined;
  }

  // Clear old dependencies
  for (const dep of effect.dependencies) {
    dep.subscribers.delete(effect);
  }
  effect.dependencies.clear();

  // Run with tracking
  const prev = setActiveObserver(effect);
  try {
    effect.cleanup = effect.fn() ?? undefined;
  } finally {
    setActiveObserver(prev);
  }
}

export function startBatch(): void {
  batchDepth++;
}

export function endBatch(): void {
  batchDepth--;
  if (batchDepth === 0) {
    const effects = [...pendingEffects];
    pendingEffects.clear();
    for (const effect of effects) {
      runEffect(effect);
    }
  }
}
