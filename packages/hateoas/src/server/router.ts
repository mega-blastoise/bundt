/**
 * HATEOAS-compliant server router for Bun.serve().
 * Provides resource-oriented routing with automatic content negotiation,
 * conditional request handling, and self-descriptive responses.
 */

import type {
  HypermediaResource,
  RequestContext,
  MediaTypeId,
  HttpMethod
} from '../types.ts';
import { negotiateMediaType, getParser, generateETag, checkConditional } from '../protocol/index.ts';

type ResourceResponse = {
  resource: HypermediaResource;
  status?: number;
  headers?: Record<string, string>;
  maxAge?: number;
  lastModified?: Date;
};

type RouteHandlerFn = (ctx: RequestContext) => ResourceResponse | Promise<ResourceResponse>;

type Route = {
  method: HttpMethod;
  pattern: URLPattern;
  handler: RouteHandlerFn;
};

type ErrorHandler = (error: unknown, ctx: RequestContext) => Response | Promise<Response>;

type RouterConfig = {
  basePath?: string;
  defaultMediaType?: MediaTypeId;
  corsOrigin?: string | boolean;
  onError?: ErrorHandler;
};

export type Router = {
  get: (path: string, handler: RouteHandlerFn) => Router;
  post: (path: string, handler: RouteHandlerFn) => Router;
  put: (path: string, handler: RouteHandlerFn) => Router;
  patch: (path: string, handler: RouteHandlerFn) => Router;
  delete: (path: string, handler: RouteHandlerFn) => Router;
  options: (path: string, handler: RouteHandlerFn) => Router;
  handle: (request: Request) => Promise<Response>;
};

export function createRouter(config: RouterConfig = {}): Router {
  const {
    basePath = '',
    defaultMediaType = 'application/hal+json',
    corsOrigin,
    onError
  } = config;

  const routes: Route[] = [];

  function addRoute(method: HttpMethod, path: string, handler: RouteHandlerFn) {
    const fullPath = basePath + path;
    routes.push({
      method,
      pattern: new URLPattern({ pathname: fullPath }),
      handler
    });
  }

  function buildContext(request: Request, params: Record<string, string>): RequestContext {
    const url = new URL(request.url);
    return {
      request,
      params,
      query: url.searchParams,
      url
    };
  }

  function corsHeaders(): Record<string, string> {
    if (!corsOrigin) return {};
    const origin = corsOrigin === true ? '*' : corsOrigin;
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, If-None-Match, If-Modified-Since',
      'Access-Control-Expose-Headers': 'ETag, Last-Modified, Link, Location'
    };
  }

  function buildLinkHeader(resource: HypermediaResource): string {
    return resource.links
      .map((link) => {
        let header = `<${link.href}>; rel="${link.rel}"`;
        if (link.type) header += `; type="${link.type}"`;
        if (link.title) header += `; title="${link.title}"`;
        return header;
      })
      .join(', ');
  }

  async function handle(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS' && corsOrigin) {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const method = request.method as HttpMethod;

    for (const route of routes) {
      if (route.method !== method) continue;

      const match = route.pattern.exec(request.url);
      if (!match) continue;

      const params: Record<string, string> = {};
      for (const [key, value] of Object.entries(match.pathname.groups)) {
        if (value !== undefined) params[key] = value;
      }

      const ctx = buildContext(request, params);

      try {
        const result = await route.handler(ctx);

        const accept = request.headers.get('accept') ?? defaultMediaType;
        const mediaType = negotiateMediaType(accept);
        const parser = getParser(mediaType);
        const body = JSON.stringify(parser.serialize(result.resource));

        const etag = generateETag(body);
        const lastModified = result.lastModified?.toUTCString();

        const conditionalResponse = checkConditional(request, { etag, lastModified });
        if (conditionalResponse) {
          for (const [k, v] of Object.entries(corsHeaders())) {
            conditionalResponse.headers.set(k, v);
          }
          return conditionalResponse;
        }

        const headers: Record<string, string> = {
          'Content-Type': `${mediaType}; charset=utf-8`,
          ETag: etag,
          Vary: 'Accept',
          ...corsHeaders(),
          ...(result.headers ?? {})
        };

        if (lastModified) {
          headers['Last-Modified'] = lastModified;
        }

        if (result.maxAge !== undefined) {
          headers['Cache-Control'] = `max-age=${result.maxAge}`;
        }

        const linkHeader = buildLinkHeader(result.resource);
        if (linkHeader) {
          headers['Link'] = linkHeader;
        }

        return new Response(body, {
          status: result.status ?? 200,
          headers
        });
      } catch (error) {
        if (onError) return onError(error, ctx);

        const status = error instanceof HttpError ? error.status : 500;
        const message = error instanceof Error ? error.message : 'Internal Server Error';

        return new Response(
          JSON.stringify({
            _links: { self: { href: ctx.url.pathname } },
            error: message,
            status
          }),
          {
            status,
            headers: {
              'Content-Type': 'application/hal+json; charset=utf-8',
              ...corsHeaders()
            }
          }
        );
      }
    }

    // 404 with HATEOAS - include link to root
    return new Response(
      JSON.stringify({
        _links: {
          home: { href: basePath || '/' }
        },
        error: 'Not Found',
        status: 404
      }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/hal+json; charset=utf-8',
          ...corsHeaders()
        }
      }
    );
  }

  const router: Router = {
    get: (path, handler) => { addRoute('GET', path, handler); return router; },
    post: (path, handler) => { addRoute('POST', path, handler); return router; },
    put: (path, handler) => { addRoute('PUT', path, handler); return router; },
    patch: (path, handler) => { addRoute('PATCH', path, handler); return router; },
    delete: (path, handler) => { addRoute('DELETE', path, handler); return router; },
    options: (path, handler) => { addRoute('OPTIONS', path, handler); return router; },
    handle
  };

  return router;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(message = 'Bad Request') { return new HttpError(400, message); }
  static notFound(message = 'Not Found') { return new HttpError(404, message); }
  static conflict(message = 'Conflict') { return new HttpError(409, message); }
  static gone(message = 'Gone') { return new HttpError(410, message); }
  static unprocessable(message = 'Unprocessable Entity') { return new HttpError(422, message); }
}
