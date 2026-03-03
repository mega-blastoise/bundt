import { describe, expect, test } from 'bun:test';
import { createRouter, HttpError } from './router.ts';
import { resource } from './resource.ts';

describe('HATEOAS Router', () => {
  function createTestRouter() {
    return createRouter({ basePath: '/api', corsOrigin: true })
      .get('/', (ctx) => ({
        resource: resource({ name: 'Test API' })
          .self(`${ctx.url.origin}/api/`)
          .link('items', `${ctx.url.origin}/api/items`)
          .build()
      }))
      .get('/items', (ctx) => ({
        resource: resource({ count: 0 })
          .self(`${ctx.url.origin}/api/items`)
          .build()
      }))
      .get('/items/:id', (ctx) => {
        if (ctx.params['id'] === '404') throw HttpError.notFound();
        return {
          resource: resource({ id: ctx.params['id'] })
            .self(`${ctx.url.origin}/api/items/${ctx.params['id']}`)
            .build(),
          lastModified: new Date('2024-01-01')
        };
      });
  }

  test('responds with HAL+JSON by default', async () => {
    const router = createTestRouter();
    const response = await router.handle(
      new Request('http://localhost/api/')
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('hal+json');

    const body = await response.json();
    expect(body._links.self.href).toContain('/api/');
    expect(body._links.items).toBeDefined();
    expect(body.name).toBe('Test API');
  });

  test('includes ETag header', async () => {
    const router = createTestRouter();
    const response = await router.handle(
      new Request('http://localhost/api/')
    );
    expect(response.headers.get('etag')).toBeTruthy();
  });

  test('includes Link header', async () => {
    const router = createTestRouter();
    const response = await router.handle(
      new Request('http://localhost/api/')
    );
    const linkHeader = response.headers.get('link');
    expect(linkHeader).toContain('rel="self"');
    expect(linkHeader).toContain('rel="items"');
  });

  test('includes Vary: Accept header', async () => {
    const router = createTestRouter();
    const response = await router.handle(
      new Request('http://localhost/api/')
    );
    expect(response.headers.get('vary')).toBe('Accept');
  });

  test('supports conditional requests (304)', async () => {
    const router = createTestRouter();

    // First request to get ETag
    const first = await router.handle(
      new Request('http://localhost/api/items/1')
    );
    const etag = first.headers.get('etag')!;

    // Conditional request
    const second = await router.handle(
      new Request('http://localhost/api/items/1', {
        headers: { 'If-None-Match': etag }
      })
    );
    expect(second.status).toBe(304);
  });

  test('returns 404 with home link for unknown routes', async () => {
    const router = createTestRouter();
    const response = await router.handle(
      new Request('http://localhost/api/unknown')
    );
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body._links.home).toBeDefined();
  });

  test('handles HttpError with status code', async () => {
    const router = createTestRouter();
    const response = await router.handle(
      new Request('http://localhost/api/items/404')
    );
    expect(response.status).toBe(404);
  });

  test('negotiates Siren format', async () => {
    const router = createTestRouter();
    const response = await router.handle(
      new Request('http://localhost/api/', {
        headers: { Accept: 'application/vnd.siren+json' }
      })
    );

    expect(response.headers.get('content-type')).toContain('siren+json');
    const body = await response.json();
    expect(body.properties.name).toBe('Test API');
    expect(body.links).toBeDefined();
  });

  test('CORS headers are present', async () => {
    const router = createTestRouter();
    const response = await router.handle(
      new Request('http://localhost/api/')
    );
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });

  test('OPTIONS preflight returns 204', async () => {
    const router = createTestRouter();
    const response = await router.handle(
      new Request('http://localhost/api/', { method: 'OPTIONS' })
    );
    expect(response.status).toBe(204);
  });

  test('route params are extracted', async () => {
    const router = createTestRouter();
    const response = await router.handle(
      new Request('http://localhost/api/items/42')
    );
    const body = await response.json();
    expect(body.id).toBe('42');
  });

  test('includes Last-Modified when provided', async () => {
    const router = createTestRouter();
    const response = await router.handle(
      new Request('http://localhost/api/items/1')
    );
    expect(response.headers.get('last-modified')).toBeTruthy();
  });
});
