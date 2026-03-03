export function deterministicStringify<T>(obj: T): string {
  "use strict";

  function sortKeys(value: unknown): unknown {
    "use strict";

    if (value === null || typeof value !== "object") {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(sortKeys);
    }

    const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
    const result: Record<string, unknown> = {};

    for (const key of sortedKeys) {
      result[key] = sortKeys((value as Record<string, unknown>)[key]);
    }

    return result;
  }

  return JSON.stringify(sortKeys(obj));
}
