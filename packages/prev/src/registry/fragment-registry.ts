import type { FragmentDefinition } from '../types';

export interface FragmentRegistry {
  register(definition: FragmentDefinition): void;
  get(id: string): FragmentDefinition;
  has(id: string): boolean;
  list(filter?: { tags?: string[] }): FragmentDefinition[];
  getSchema(id: string): Record<string, unknown>;
}

export function createFragmentRegistry(fragments: FragmentDefinition[] = []): FragmentRegistry {
  const store = new Map<string, FragmentDefinition>();

  function register(definition: FragmentDefinition): void {
    if (store.has(definition.id)) {
      throw new Error(`Fragment "${definition.id}" is already registered`);
    }
    if (!definition.id || !definition.name || !definition.render) {
      throw new Error(`Fragment definition must have id, name, and render`);
    }
    store.set(definition.id, Object.freeze(definition) as FragmentDefinition);
  }

  function get(id: string): FragmentDefinition {
    const def = store.get(id);
    if (!def) {
      throw new Error(`Fragment "${id}" not found in registry`);
    }
    return def;
  }

  function has(id: string): boolean {
    return store.has(id);
  }

  function list(filter?: { tags?: string[] }): FragmentDefinition[] {
    const all = Array.from(store.values());
    if (!filter?.tags?.length) return all;
    return all.filter((f) => f.tags?.some((t) => filter.tags!.includes(t)));
  }

  function getSchema(id: string): Record<string, unknown> {
    const def = get(id);
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      tags: def.tags,
      interactions: Object.keys(def.interactions),
      data: Object.keys(def.data),
      layoutHints: def.layoutHints
    };
  }

  for (const fragment of fragments) {
    register(fragment);
  }

  return { register, get, has, list, getSchema };
}
