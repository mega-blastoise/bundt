import { describe, expect, test } from 'bun:test';

import { isWaavyError } from './errors';
import { parseRenderRequest, PROTOCOL_VERSION, protocolJsonSchema, type RenderRequest } from './protocol';

/** Asserts that parsing throws INVALID_REQUEST mentioning `fragment`. */
function expectInvalid(input: unknown, fragment: string): void {
  try {
    parseRenderRequest(input);
  } catch (error) {
    expect(isWaavyError(error) && error.code).toBe('INVALID_REQUEST');
    expect((error as Error).message).toContain(fragment);
    return;
  }
  throw new Error('expected parseRenderRequest to throw');
}

describe('parseRenderRequest', () => {
  test('applies defaults', () => {
    expect(parseRenderRequest({ v: 1, page: 'home' })).toEqual({ v: 1, page: 'home', props: {}, stream: false });
  });

  test('accepts a full request', () => {
    const request: RenderRequest = {
      v: 1,
      page: 'account/settings',
      props: { nested: { list: [1, 'two', null, true] } },
      document: { title: 'T', lang: 'en-GB', head: '<meta name="x">' },
      stream: true,
      timeoutMs: 500
    };
    expect(parseRenderRequest(request)).toEqual(request);
  });

  test('is idempotent on its own output', () => {
    const once = parseRenderRequest({ v: 1, page: 'home', props: { a: 1 } });
    expect(parseRenderRequest(once)).toEqual(once);
  });

  test.each([
    [{ v: 2, page: 'home' }, 'v'],
    [{ page: 'home' }, 'v'],
    [{ v: 1, page: 'Home' }, 'page'],
    [{ v: 1, page: '../x' }, 'page'],
    [{ v: 1, page: 'home', props: [] }, 'props'],
    [{ v: 1, page: 'home', document: { lang: 'en us' } }, 'document.lang'],
    [{ v: 1, page: 'home', timeoutMs: 0 }, 'timeoutMs'],
    [{ v: 1, page: 'home', timeoutMs: 1.5 }, 'timeoutMs'],
    [{ v: 1, page: 'home', extra: true }, 'extra'],
    ['not an object', '(root)']
  ])('rejects %p', (input, fragment) => {
    expectInvalid(input, fragment);
  });
});

describe('protocolJsonSchema', () => {
  test('describes the request and error body', () => {
    const schema = protocolJsonSchema();
    expect(schema['protocolVersion']).toBe(PROTOCOL_VERSION);
    expect(schema).toMatchSnapshot();
  });
});
