import type { SerializableObject } from "@/types";

export type ComponentPath = string;
export type ComponentName = "default" | string;

/**
 * Represents a component by its file path and export name
 * @member {0} string The path to the component
 * @member {1} string The name of the component, "default" for default exported components
 */
export type ComponentRepresentation = [ComponentPath, ComponentName];

export type CacheEntry = {
  createdAt?: string | Date;
  id: string;
  props: string;
  cpath: string;
  cname: string;
  cacheKey: string;
};

export type CacheEntryWithRenderOutput = CacheEntry & {
  cachedRenderOutput: string;
};

export type WriteEntryToCacheOptions<Props extends SerializableObject> = {
  componentRepresentation: ComponentRepresentation;
  renderOutput: string;
  props: Props;
  cacheType: "bunfs" | "sqlite3";
};
