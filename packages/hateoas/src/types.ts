/**
 * Core HATEOAS type definitions aligned with:
 * - RFC 8288 (Web Linking)
 * - RFC 6570 (URI Templates)
 * - HAL (Hypertext Application Language)
 * - Siren (Structured Interface for Representing Entities)
 */

// --- Link Relations (RFC 8288) ---

export type HypermediaLink = {
  href: string;
  rel: string;
  type?: string;
  title?: string;
  templated?: boolean;
  method?: HttpMethod;
  hreflang?: string;
  profile?: string;
  deprecation?: string;
};

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// --- Hypermedia Actions (forms/operations) ---

export type HypermediaAction = {
  name: string;
  href: string;
  method: HttpMethod;
  type?: string;
  title?: string;
  fields?: ActionField[];
};

export type ActionField = {
  name: string;
  type?: FieldType;
  value?: unknown;
  title?: string;
  required?: boolean;
  pattern?: string;
};

export type FieldType =
  | 'hidden'
  | 'text'
  | 'number'
  | 'email'
  | 'url'
  | 'date'
  | 'datetime-local'
  | 'checkbox'
  | 'select'
  | 'textarea'
  | 'file';

// --- Resources ---

export type HypermediaResource<T = Record<string, unknown>> = {
  uri: string;
  properties: T;
  links: HypermediaLink[];
  actions: HypermediaAction[];
  embedded: Record<string, HypermediaResource[]>;
};

// --- Cache ---

export type CacheEntry = {
  resource: HypermediaResource;
  etag?: string;
  lastModified?: string;
  maxAge?: number;
  timestamp: number;
};

// --- Media Types ---

export type MediaTypeId =
  | 'application/hal+json'
  | 'application/vnd.siren+json'
  | 'application/json';

export type MediaTypeParser = {
  id: MediaTypeId;
  parse: (body: unknown, uri: string) => HypermediaResource;
  serialize: (resource: HypermediaResource) => unknown;
};

// --- Server Types ---

export type RouteHandler = (ctx: RequestContext) => Response | Promise<Response>;

export type RequestContext = {
  request: Request;
  params: Record<string, string>;
  query: URLSearchParams;
  url: URL;
};

export type ResourceDefinition<T = Record<string, unknown>> = {
  type: string;
  path: string;
  links?: (resource: T, ctx: RequestContext) => HypermediaLink[];
  actions?: (resource: T, ctx: RequestContext) => HypermediaAction[];
};

// --- Client Types ---

export type ClientConfig = {
  entryPoint: string;
  mediaType?: MediaTypeId;
  headers?: Record<string, string>;
  cache?: boolean;
};

export type ResourceState<T = Record<string, unknown>> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; resource: HypermediaResource<T>; stale: boolean }
  | { status: 'error'; error: Error };
