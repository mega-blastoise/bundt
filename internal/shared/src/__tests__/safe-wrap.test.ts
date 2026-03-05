import { describe, expect, test } from 'bun:test';
import { safeWrap, safeWrapAsync, SafeFunctionState } from '../safe-wrap';

describe('safeWrap', () => {
  test('wraps successful function', () => {
    const wrapped = safeWrap((x: unknown) => Number(x) * 2);
    const result = wrapped(5);
    expect(result.data).toBe(10);
    expect(result.error).toBeNull();
    expect(result.state).toBe(SafeFunctionState.SUCCEEDED);
  });

  test('wraps throwing function', () => {
    const wrapped = safeWrap(() => {
      throw new Error('wrapped error');
    });
    const result = wrapped();
    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('wrapped error');
    expect(result.state).toBe(SafeFunctionState.FAILED);
  });

  test('wraps non-Error throws', () => {
    const wrapped = safeWrap(() => {
      throw 'raw string';
    });
    const result = wrapped();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('raw string');
  });
});

describe('safeWrapAsync', () => {
  test('wraps successful async function', async () => {
    const wrapped = safeWrapAsync(async (x: unknown) => Number(x) + 1);
    const result = await wrapped(10);
    expect(result.data).toBe(11);
    expect(result.error).toBeNull();
    expect(result.state).toBe(SafeFunctionState.SUCCEEDED);
  });

  test('wraps failing async function', async () => {
    const wrapped = safeWrapAsync(async () => {
      throw new Error('async fail');
    });
    const result = await wrapped();
    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('async fail');
    expect(result.state).toBe(SafeFunctionState.FAILED);
  });
});
