// Core types
export type {
  HypermediaResource,
  HypermediaLink,
  HypermediaAction,
  ActionField,
  HttpMethod,
  MediaTypeId,
  ResourceState,
  ClientConfig,
  RequestContext,
  ResourceDefinition,
  CacheEntry
} from './types.ts';

// Protocol
export {
  expandUriTemplate,
  extractTemplateVariables,
  isUriTemplate
} from './protocol/uri-template.ts';
export { getParser, negotiateMediaType } from './protocol/media-types.ts';
export {
  generateETag,
  checkConditional,
  parseCacheControl
} from './protocol/conditional.ts';

// Server
export { createRouter, HttpError } from './server/router.ts';
export type { Router } from './server/router.ts';
export { resource, collection } from './server/resource.ts';
export type { ResourceBuilder } from './server/resource.ts';
export { serve } from './server/serve.ts';

// Client
export { createClient, HypermediaError } from './client/hypermedia-client.ts';
export type { HypermediaClient } from './client/hypermedia-client.ts';
export { createCache } from './client/cache.ts';
export type { ResourceCache } from './client/cache.ts';

// React
export {
  HypermediaProvider,
  useHypermediaClient,
  useEntryPoint
} from './react/context.tsx';
export {
  useRoot,
  useLink,
  useResource,
  useAction,
  useEmbedded,
  useHasLink,
  useHasAction
} from './react/hooks.ts';
export {
  HypermediaNav,
  ResourceView,
  ActionForm,
  IfLink,
  IfAction,
  EmbeddedList
} from './react/components.tsx';
