/**
 * Client-side resource cache keyed by canonical URI.
 * Supports TTL-based expiration and conditional request headers.
 */

import type { CacheEntry, HypermediaResource } from '../types.ts';

export type ResourceCache = {
  get: (uri: string) => CacheEntry | undefined;
  set: (uri: string, entry: CacheEntry) => void;
  invalidate: (uri: string) => void;
  invalidatePattern: (pattern: RegExp) => void;
  conditionalHeaders: (uri: string) => Record<string, string>;
  clear: () => void;
  size: () => number;
};

export function createCache(maxEntries = 500): ResourceCache {
  const entries = new Map<string, CacheEntry>();

  function evictStale() {
    const now = Date.now();
    for (const [uri, entry] of entries) {
      if (entry.maxAge !== undefined && now - entry.timestamp > entry.maxAge * 1000) {
        entries.delete(uri);
      }
    }
  }

  function evictOldest() {
    if (entries.size <= maxEntries) return;
    const oldest = [...entries.entries()]
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      .slice(0, entries.size - maxEntries);
    for (const [uri] of oldest) {
      entries.delete(uri);
    }
  }

  return {
    get(uri) {
      const entry = entries.get(uri);
      if (!entry) return undefined;
      if (entry.maxAge !== undefined) {
        const age = (Date.now() - entry.timestamp) / 1000;
        if (age > entry.maxAge) {
          entries.delete(uri);
          return undefined;
        }
      }
      return entry;
    },

    set(uri, entry) {
      entries.set(uri, entry);
      evictOldest();
    },

    invalidate(uri) {
      entries.delete(uri);
    },

    invalidatePattern(pattern) {
      for (const uri of entries.keys()) {
        if (pattern.test(uri)) entries.delete(uri);
      }
    },

    conditionalHeaders(uri) {
      const entry = entries.get(uri);
      if (!entry) return {};
      const headers: Record<string, string> = {};
      if (entry.etag) headers['If-None-Match'] = entry.etag;
      if (entry.lastModified) headers['If-Modified-Since'] = entry.lastModified;
      return headers;
    },

    clear() {
      entries.clear();
    },

    size() {
      evictStale();
      return entries.size;
    }
  };
}
