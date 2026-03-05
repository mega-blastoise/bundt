import type { Effect } from './graph';
import { runEffect } from './graph';

export function createEffect(fn: () => void | (() => void)): () => void {
  const effect: Effect = {
    kind: 'effect',
    fn,
    cleanup: undefined,
    dependencies: new Set(),
    disposed: false
  };

  runEffect(effect);

  return () => {
    effect.disposed = true;
    if (effect.cleanup) {
      effect.cleanup();
      effect.cleanup = undefined;
    }
    for (const dep of effect.dependencies) {
      dep.subscribers.delete(effect);
    }
    effect.dependencies.clear();
  };
}
