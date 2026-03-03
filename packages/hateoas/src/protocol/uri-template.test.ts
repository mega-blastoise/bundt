import { describe, expect, test } from 'bun:test';
import { expandUriTemplate, extractTemplateVariables, isUriTemplate } from './uri-template.ts';

describe('URI Template (RFC 6570)', () => {
  const vars = {
    id: '42',
    name: 'John Doe',
    empty: '',
    list: ['red', 'green', 'blue'],
    keys: { semi: ';', dot: '.', comma: ',' },
    page: 2,
    pageSize: 20
  };

  test('simple string expansion', () => {
    expect(expandUriTemplate('/users/{id}', vars)).toBe('/users/42');
    expect(expandUriTemplate('/users/{id}/posts/{name}', vars)).toBe(
      '/users/42/posts/John%20Doe'
    );
  });

  test('reserved expansion (+)', () => {
    expect(expandUriTemplate('/search{+name}', { name: '/foo/bar' })).toBe(
      '/search/foo/bar'
    );
  });

  test('fragment expansion (#)', () => {
    expect(expandUriTemplate('/page{#id}', vars)).toBe('/page#42');
  });

  test('label expansion (.)', () => {
    expect(expandUriTemplate('/file{.name}', { name: 'json' })).toBe('/file.json');
  });

  test('path expansion (/)', () => {
    expect(expandUriTemplate('/api{/id}', vars)).toBe('/api/42');
  });

  test('query expansion (?)', () => {
    expect(expandUriTemplate('/tasks{?page,pageSize}', vars)).toBe(
      '/tasks?page=2&pageSize=20'
    );
  });

  test('query continuation (&)', () => {
    expect(expandUriTemplate('/tasks?sort=date{&page,pageSize}', vars)).toBe(
      '/tasks?sort=date&page=2&pageSize=20'
    );
  });

  test('list explosion (*)', () => {
    expect(expandUriTemplate('/colors{?list*}', vars)).toBe(
      '/colors?list=red&list=green&list=blue'
    );
  });

  test('undefined variables are omitted', () => {
    expect(expandUriTemplate('/users/{id}{?missing}', vars)).toBe('/users/42');
  });

  test('prefix modifier (:)', () => {
    expect(expandUriTemplate('/users/{name:4}', vars)).toBe('/users/John');
  });

  test('extractTemplateVariables', () => {
    expect(extractTemplateVariables('/tasks{?q,completed}')).toEqual([
      'q',
      'completed'
    ]);
    expect(extractTemplateVariables('/users/{id}/posts')).toEqual(['id']);
  });

  test('isUriTemplate', () => {
    expect(isUriTemplate('/tasks{?q}')).toBe(true);
    expect(isUriTemplate('/tasks')).toBe(false);
  });
});
