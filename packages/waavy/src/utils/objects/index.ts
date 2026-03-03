export function objectIsEmpty<O extends object = {}>(o: O, strict = false): boolean {
  const hasNoEnumeratedProperties = Object.keys(o).length === 0 && Object.values(o).length === 0;
  if (!strict) return hasNoEnumeratedProperties;
  const hasNoProperties = Object.getOwnPropertyNames(o).length === 0;
  return hasNoEnumeratedProperties && hasNoProperties;
}

export function createDeterministicStructure(obj: object) {
  function processValue(value: unknown): any {
    if (value === null || typeof value !== "object") {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(processValue);
    }

    // Convert to sorted array of [key, value] pairs
    const sortedKeys = Object.keys(value).sort();
    return sortedKeys.map((key) => [key, processValue((value as any)[key])]);
  }

  return processValue(obj);
}
