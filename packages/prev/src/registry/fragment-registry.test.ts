import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { createFragmentRegistry } from './fragment-registry';
import type { FragmentDefinition } from '../types';

function makeFragment(overrides: Partial<FragmentDefinition> = {}): FragmentDefinition {
  return {
    id: overrides.id ?? 'test-fragment',
    name: overrides.name ?? 'Test Fragment',
    props: z.object({ title: z.string() }),
    data: {},
    interactions: {},
    render: ({ props }) => null,
    ...overrides
  } as FragmentDefinition;
}

describe('FragmentRegistry', () => {
  test('register and get', () => {
    const registry = createFragmentRegistry();
    const fragment = makeFragment();
    registry.register(fragment);
    expect(registry.get('test-fragment').id).toBe('test-fragment');
  });

  test('has returns true for registered', () => {
    const registry = createFragmentRegistry([makeFragment()]);
    expect(registry.has('test-fragment')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });

  test('throws on duplicate registration', () => {
    const registry = createFragmentRegistry([makeFragment()]);
    expect(() => registry.register(makeFragment())).toThrow('already registered');
  });

  test('throws on get for missing fragment', () => {
    const registry = createFragmentRegistry();
    expect(() => registry.get('missing')).toThrow('not found');
  });

  test('list returns all fragments', () => {
    const registry = createFragmentRegistry([
      makeFragment({ id: 'a', name: 'A' }),
      makeFragment({ id: 'b', name: 'B' })
    ]);
    expect(registry.list()).toHaveLength(2);
  });

  test('list filters by tags', () => {
    const registry = createFragmentRegistry([
      makeFragment({ id: 'a', name: 'A', tags: ['chart'] }),
      makeFragment({ id: 'b', name: 'B', tags: ['table'] })
    ]);
    expect(registry.list({ tags: ['chart'] })).toHaveLength(1);
    expect(registry.list({ tags: ['chart'] })[0]!.id).toBe('a');
  });

  test('getSchema returns fragment metadata', () => {
    const registry = createFragmentRegistry([makeFragment({ tags: ['test'] })]);
    const schema = registry.getSchema('test-fragment');
    expect(schema.id).toBe('test-fragment');
    expect(schema.tags).toEqual(['test']);
  });

  test('initializes from constructor array', () => {
    const registry = createFragmentRegistry([
      makeFragment({ id: 'x', name: 'X' }),
      makeFragment({ id: 'y', name: 'Y' })
    ]);
    expect(registry.has('x')).toBe(true);
    expect(registry.has('y')).toBe(true);
  });
});
