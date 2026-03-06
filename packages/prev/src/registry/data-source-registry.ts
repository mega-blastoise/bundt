import type { DataSourceDefinition } from '../types';

export interface DataSourceRegistry {
  register(definition: DataSourceDefinition): void;
  get(id: string): DataSourceDefinition;
  has(id: string): boolean;
  list(filter?: { tags?: string[] }): DataSourceDefinition[];
  getSchema(id: string): Record<string, unknown>;
}

export function createDataSourceRegistry(dataSources: DataSourceDefinition[] = []): DataSourceRegistry {
  const store = new Map<string, DataSourceDefinition>();

  function register(definition: DataSourceDefinition): void {
    if (store.has(definition.id)) {
      throw new Error(`Data source "${definition.id}" is already registered`);
    }
    if (!definition.id || !definition.name || !definition.fetch) {
      throw new Error(`Data source definition must have id, name, and fetch`);
    }
    store.set(definition.id, Object.freeze(definition) as DataSourceDefinition);
  }

  function get(id: string): DataSourceDefinition {
    const def = store.get(id);
    if (!def) {
      throw new Error(`Data source "${id}" not found in registry`);
    }
    return def;
  }

  function has(id: string): boolean {
    return store.has(id);
  }

  function list(filter?: { tags?: string[] }): DataSourceDefinition[] {
    const all = Array.from(store.values());
    if (!filter?.tags?.length) return all;
    return all.filter((ds) => ds.tags?.some((t) => filter.tags!.includes(t)));
  }

  function getSchema(id: string): Record<string, unknown> {
    const def = get(id);
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      tags: def.tags,
      ttl: def.ttl
    };
  }

  for (const ds of dataSources) {
    register(ds);
  }

  return { register, get, has, list, getSchema };
}
