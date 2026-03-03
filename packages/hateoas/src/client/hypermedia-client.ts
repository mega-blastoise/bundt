/**
 * Hypermedia-aware HTTP client.
 * Discovers API capabilities through link relations rather than hardcoded URLs.
 * Supports content negotiation, conditional requests, and URI template expansion.
 */

import type {
  HypermediaResource,
  HypermediaLink,
  HypermediaAction,
  ClientConfig,
  MediaTypeId,
  HttpMethod
} from '../types.ts';
import { getParser } from '../protocol/media-types.ts';
import { expandUriTemplate, isUriTemplate } from '../protocol/uri-template.ts';
import { parseCacheControl } from '../protocol/conditional.ts';
import { createCache, type ResourceCache } from './cache.ts';

export type HypermediaClient = {
  /** Fetch the API entry point */
  root: () => Promise<HypermediaResource>;

  /** Fetch a resource by absolute URI */
  fetch: (uri: string) => Promise<HypermediaResource>;

  /** Follow a link relation from a resource */
  follow: (
    resource: HypermediaResource,
    rel: string,
    variables?: Record<string, unknown>
  ) => Promise<HypermediaResource>;

  /** Execute a hypermedia action (form submission) */
  execute: (
    action: HypermediaAction,
    data?: Record<string, unknown>
  ) => Promise<HypermediaResource>;

  /** Find a link by relation in a resource */
  findLink: (resource: HypermediaResource, rel: string) => HypermediaLink | undefined;

  /** Find all links with a given relation */
  findLinks: (resource: HypermediaResource, rel: string) => HypermediaLink[];

  /** Find an action by name in a resource */
  findAction: (resource: HypermediaResource, name: string) => HypermediaAction | undefined;

  /** Resolve a link href, expanding URI templates if needed */
  resolveHref: (link: HypermediaLink, variables?: Record<string, unknown>) => string;

  /** Direct access to the cache */
  cache: ResourceCache;

  /** Invalidate cache for a URI or pattern */
  invalidate: (uriOrPattern: string | RegExp) => void;
};

export function createClient(config: ClientConfig): HypermediaClient {
  const {
    entryPoint,
    mediaType = 'application/hal+json',
    headers: defaultHeaders = {},
    cache: enableCache = true
  } = config;

  const resourceCache = createCache();

  function buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Accept: mediaType,
      ...defaultHeaders,
      ...extra
    };
  }

  function resolveUri(base: string, href: string): string {
    if (href.startsWith('http://') || href.startsWith('https://')) return href;
    return new URL(href, base).toString();
  }

  async function fetchResource(
    uri: string,
    method: HttpMethod = 'GET',
    body?: unknown
  ): Promise<HypermediaResource> {
    const resolvedUri = resolveUri(entryPoint, uri);

    if (enableCache && method === 'GET') {
      const cached = resourceCache.get(resolvedUri);
      if (cached) return cached.resource;
    }

    const conditionalHeaders =
      enableCache && method === 'GET'
        ? resourceCache.conditionalHeaders(resolvedUri)
        : {};

    const headers = buildHeaders(conditionalHeaders);

    const init: RequestInit = { method, headers };
    if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
      init.body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }

    const response = await globalThis.fetch(resolvedUri, init);

    if (response.status === 304) {
      const cached = resourceCache.get(resolvedUri);
      if (cached) return cached.resource;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new HypermediaError(response.status, response.statusText, text, resolvedUri);
    }

    const contentType = response.headers.get('content-type') ?? mediaType;
    const parserId = detectMediaType(contentType);
    const parser = getParser(parserId);
    const responseBody = await response.json();
    const resource = parser.parse(responseBody, resolvedUri);

    if (enableCache && method === 'GET') {
      const etag = response.headers.get('etag') ?? undefined;
      const lastModified = response.headers.get('last-modified') ?? undefined;
      const cacheControl = parseCacheControl(response.headers.get('cache-control'));

      if (!cacheControl.noStore) {
        resourceCache.set(resolvedUri, {
          resource,
          etag,
          lastModified,
          maxAge: cacheControl.maxAge,
          timestamp: Date.now()
        });
      }
    }

    // Unsafe methods invalidate the resource cache
    if (method !== 'GET' && method !== 'HEAD') {
      resourceCache.invalidate(resolvedUri);
    }

    return resource;
  }

  function detectMediaType(contentType: string): MediaTypeId {
    if (contentType.includes('hal+json')) return 'application/hal+json';
    if (contentType.includes('siren+json')) return 'application/vnd.siren+json';
    return 'application/json';
  }

  const client: HypermediaClient = {
    root() {
      return fetchResource(entryPoint);
    },

    fetch(uri) {
      return fetchResource(uri);
    },

    follow(resource, rel, variables) {
      const link = client.findLink(resource, rel);
      if (!link) {
        throw new HypermediaError(
          0,
          'Link Not Found',
          `No link with rel="${rel}" found in resource at ${resource.uri}`,
          resource.uri
        );
      }
      const href = client.resolveHref(link, variables);
      return fetchResource(href, link.method ?? 'GET');
    },

    async execute(action, data) {
      const href = resolveUri(entryPoint, action.href);

      if (action.method === 'GET') {
        const params = data ? new URLSearchParams(
          Object.entries(data).map(([k, v]) => [k, String(v)])
        ) : undefined;
        const uri = params ? `${href}?${params}` : href;
        return fetchResource(uri, 'GET');
      }

      return fetchResource(href, action.method, data);
    },

    findLink(resource, rel) {
      return resource.links.find((l) => l.rel === rel);
    },

    findLinks(resource, rel) {
      return resource.links.filter((l) => l.rel === rel);
    },

    findAction(resource, name) {
      return resource.actions.find((a) => a.name === name);
    },

    resolveHref(link, variables = {}) {
      if (link.templated && isUriTemplate(link.href)) {
        return resolveUri(entryPoint, expandUriTemplate(link.href, variables));
      }
      return resolveUri(entryPoint, link.href);
    },

    cache: resourceCache,

    invalidate(uriOrPattern) {
      if (typeof uriOrPattern === 'string') {
        resourceCache.invalidate(uriOrPattern);
      } else {
        resourceCache.invalidatePattern(uriOrPattern);
      }
    }
  };

  return client;
}

export class HypermediaError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string,
    public readonly uri: string
  ) {
    super(`${status} ${statusText} at ${uri}`);
    this.name = 'HypermediaError';
  }
}
