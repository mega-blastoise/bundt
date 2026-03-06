import type { ResolvedBinding } from '../types';

export interface BindingEvaluator {
  evaluate(
    sourceInstanceId: string,
    interaction: string,
    payload: unknown
  ): Array<{ targetInstanceId: string; targetKey: string; value: unknown }>;
}

export function createBindingEvaluator(bindings: ResolvedBinding[]): BindingEvaluator {
  function evaluate(
    sourceInstanceId: string,
    interaction: string,
    payload: unknown
  ): Array<{ targetInstanceId: string; targetKey: string; value: unknown }> {
    const matching = bindings.filter(
      (b) =>
        b.sourceFragmentInstanceId === sourceInstanceId &&
        b.sourceInteraction === interaction
    );

    return matching
      .filter((b) => b.targetType === 'prop')
      .map((b) => ({
        targetInstanceId: b.targetFragmentInstanceId,
        targetKey: b.targetKey,
        value: extractValue(payload, b.transform)
      }));
  }

  return { evaluate };
}

function extractValue(payload: unknown, transform?: string): unknown {
  if (!transform || typeof payload !== 'object' || payload === null) return payload;
  const parts = transform.split('.');
  let current: unknown = payload;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
