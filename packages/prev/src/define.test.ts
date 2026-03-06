import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { defineFragment, defineDataSource } from './index';

describe('defineFragment', () => {
  test('returns frozen definition', () => {
    const fragment = defineFragment({
      id: 'test',
      name: 'Test',
      props: z.object({ title: z.string() }),
      data: {},
      interactions: {},
      render: () => null
    });

    expect(fragment.id).toBe('test');
    expect(Object.isFrozen(fragment)).toBe(true);
  });

  test('throws without id', () => {
    expect(() =>
      defineFragment({
        id: '',
        name: 'Test',
        props: z.object({}),
        data: {},
        interactions: {},
        render: () => null
      })
    ).toThrow('must have an id');
  });

  test('throws without name', () => {
    expect(() =>
      defineFragment({
        id: 'test',
        name: '',
        props: z.object({}),
        data: {},
        interactions: {},
        render: () => null
      })
    ).toThrow('must have a name');
  });

  test('throws without render', () => {
    expect(() =>
      defineFragment({
        id: 'test',
        name: 'Test',
        props: z.object({}),
        data: {},
        interactions: {},
        render: undefined as unknown as () => null
      })
    ).toThrow('must have a render');
  });

  test('preserves interactions and data', () => {
    const fragment = defineFragment({
      id: 'test',
      name: 'Test',
      props: z.object({}),
      data: { items: { source: 'api', params: z.object({ q: z.string() }) } },
      interactions: {
        click: { payload: z.object({ id: z.string() }) }
      },
      render: () => null
    });

    expect(fragment.data['items']!.source).toBe('api');
    expect(fragment.interactions['click']).toBeDefined();
  });
});

describe('defineDataSource', () => {
  test('returns frozen definition', () => {
    const ds = defineDataSource({
      id: 'test',
      name: 'Test',
      params: z.object({ id: z.string() }),
      returns: z.object({ value: z.number() }),
      fetch: async () => ({ value: 42 })
    });

    expect(ds.id).toBe('test');
    expect(Object.isFrozen(ds)).toBe(true);
  });

  test('throws without id', () => {
    expect(() =>
      defineDataSource({
        id: '',
        name: 'Test',
        params: z.object({}),
        returns: z.object({}),
        fetch: async () => ({})
      })
    ).toThrow('must have an id');
  });

  test('throws without fetch', () => {
    expect(() =>
      defineDataSource({
        id: 'test',
        name: 'Test',
        params: z.object({}),
        returns: z.object({}),
        fetch: undefined as unknown as () => Promise<unknown>
      })
    ).toThrow('must have a fetch');
  });
});
