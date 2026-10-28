import { describe, expect, test } from 'bun:test';

import { describeError, ERROR_CODES, isWaavyError, toErrorBody, toWaavyError, WaavyError } from './errors';

describe('ERROR_CODES', () => {
  test('exit codes are unique and non-zero', () => {
    const exits = Object.values(ERROR_CODES).map((spec) => spec.exit);
    expect(new Set(exits).size).toBe(exits.length);
    expect(exits.every((code) => code > 0 && code < 126)).toBe(true);
  });

  test('HTTP statuses are client or server errors', () => {
    for (const spec of Object.values(ERROR_CODES)) {
      expect(spec.http).toBeGreaterThanOrEqual(400);
      expect(spec.http).toBeLessThan(600);
    }
  });
});

describe('WaavyError', () => {
  test('carries code, page and cause', () => {
    const cause = new Error('root');
    const error = new WaavyError('PAGE_NOT_FOUND', 'missing', { page: 'home', cause });
    expect(error).toBeInstanceOf(Error);
    expect(isWaavyError(error)).toBe(true);
    expect(error.name).toBe('WaavyError');
    expect(error.code).toBe('PAGE_NOT_FOUND');
    expect(error.page).toBe('home');
    expect(error.cause).toBe(cause);
  });
});

describe('describeError', () => {
  test.each([
    [new Error('boom'), 'boom'],
    ['plain', 'plain'],
    [{ a: 1 }, '{"a":1}'],
    [undefined, 'undefined']
  ])('describes %p', (input, expected) => {
    expect(describeError(input)).toBe(expected);
  });

  test('never throws on unserializable values', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    expect(describeError(circular)).toBe('[object Object]');
  });
});

describe('toWaavyError', () => {
  test('passes waavy errors through', () => {
    const error = new WaavyError('RENDER_FAILED', 'x');
    expect(toWaavyError(error)).toBe(error);
  });

  test('wraps anything else as INTERNAL', () => {
    const wrapped = toWaavyError(new TypeError('bad'));
    expect(wrapped.code).toBe('INTERNAL');
    expect(wrapped.message).toBe('bad');
  });
});

describe('toErrorBody', () => {
  test('includes page only when known', () => {
    expect(toErrorBody(new WaavyError('PAGE_NOT_FOUND', 'm', { page: 'p' }))).toEqual({
      error: { code: 'PAGE_NOT_FOUND', message: 'm', page: 'p' }
    });
    expect(toErrorBody(new WaavyError('INVALID_REQUEST', 'm'))).toEqual({
      error: { code: 'INVALID_REQUEST', message: 'm' }
    });
  });

  test('does not leak stacks', () => {
    const body = toErrorBody(new Error('secret path /etc'));
    expect(Object.keys(body.error)).toEqual(['code', 'message']);
  });
});
