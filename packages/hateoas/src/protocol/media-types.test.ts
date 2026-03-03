import { describe, expect, test } from 'bun:test';
import { getParser, negotiateMediaType } from './media-types.ts';

describe('HAL+JSON', () => {
  const parser = getParser('application/hal+json');

  test('parses HAL resource with links', () => {
    const hal = {
      _links: {
        self: { href: '/api/tasks/1' },
        collection: { href: '/api/tasks' }
      },
      id: '1',
      title: 'Test task'
    };

    const resource = parser.parse(hal, '/api/tasks/1');

    expect(resource.uri).toBe('/api/tasks/1');
    expect(resource.properties).toEqual({ id: '1', title: 'Test task' });
    expect(resource.links).toHaveLength(2);
    expect(resource.links[0]).toEqual({ href: '/api/tasks/1', rel: 'self' });
  });

  test('parses HAL embedded resources', () => {
    const hal = {
      _links: { self: { href: '/api/tasks' } },
      _embedded: {
        items: [
          { _links: { self: { href: '/api/tasks/1' } }, id: '1', title: 'A' },
          { _links: { self: { href: '/api/tasks/2' } }, id: '2', title: 'B' }
        ]
      },
      total: 2
    };

    const resource = parser.parse(hal, '/api/tasks');
    expect(resource.embedded['items']).toHaveLength(2);
    expect(resource.embedded['items']![0]!.uri).toBe('/api/tasks/1');
  });

  test('serializes to HAL format', () => {
    const resource = {
      uri: '/api/tasks/1',
      properties: { id: '1', title: 'Test' },
      links: [
        { href: '/api/tasks/1', rel: 'self' },
        { href: '/api/tasks', rel: 'collection' }
      ],
      actions: [],
      embedded: {}
    };

    const hal = parser.serialize(resource) as Record<string, unknown>;
    expect(hal['id']).toBe('1');
    expect(hal['_links']).toBeDefined();
  });

  test('handles array links for same relation', () => {
    const hal = {
      _links: {
        self: { href: '/api/x' },
        item: [{ href: '/a' }, { href: '/b' }]
      }
    };

    const resource = parser.parse(hal, '/api/x');
    const items = resource.links.filter((l) => l.rel === 'item');
    expect(items).toHaveLength(2);
  });
});

describe('Siren', () => {
  const parser = getParser('application/vnd.siren+json');

  test('parses Siren entity with links and actions', () => {
    const siren = {
      properties: { id: '1', title: 'Test' },
      links: [{ rel: ['self'], href: '/api/tasks/1' }],
      actions: [
        {
          name: 'delete',
          href: '/api/tasks/1',
          method: 'DELETE',
          title: 'Delete Task'
        }
      ]
    };

    const resource = parser.parse(siren, '/api/tasks/1');
    expect(resource.uri).toBe('/api/tasks/1');
    expect(resource.actions).toHaveLength(1);
    expect(resource.actions[0]!.name).toBe('delete');
  });

  test('parses Siren sub-entities', () => {
    const siren = {
      properties: { total: 1 },
      entities: [
        {
          rel: ['item'],
          properties: { id: '1' },
          links: [{ rel: ['self'], href: '/api/tasks/1' }]
        }
      ],
      links: [{ rel: ['self'], href: '/api/tasks' }]
    };

    const resource = parser.parse(siren, '/api/tasks');
    expect(resource.embedded['item']).toHaveLength(1);
  });
});

describe('Content Negotiation', () => {
  test('selects HAL for explicit accept', () => {
    expect(negotiateMediaType('application/hal+json')).toBe('application/hal+json');
  });

  test('selects Siren for explicit accept', () => {
    expect(negotiateMediaType('application/vnd.siren+json')).toBe(
      'application/vnd.siren+json'
    );
  });

  test('selects highest quality match', () => {
    expect(
      negotiateMediaType(
        'application/json;q=0.5, application/hal+json;q=1.0'
      )
    ).toBe('application/hal+json');
  });

  test('defaults to HAL when no match', () => {
    expect(negotiateMediaType('text/html')).toBe('application/hal+json');
  });
});
