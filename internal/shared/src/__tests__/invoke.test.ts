import { describe, expect, test } from 'bun:test';
import { invoke, invokeAsync, InvocationState } from '../invoke';

describe('invoke', () => {
  test('returns SUCCESS with data on successful execution', () => {
    const result = invoke(() => 42);
    expect(result.data).toBe(42);
    expect(result.error).toBeNull();
    expect(result.status).toBe(InvocationState.SUCCESS);
  });

  test('returns FAILED with error on thrown exception', () => {
    const result = invoke(() => {
      throw new Error('boom');
    });
    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('boom');
    expect(result.status).toBe(InvocationState.FAILED);
  });

  test('wraps non-Error throws into Error', () => {
    const result = invoke(() => {
      throw 'string error';
    });
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('string error');
  });
});

describe('invokeAsync', () => {
  test('returns resolved result on success', async () => {
    const result = await invokeAsync(async () => 'hello');
    expect(result.data).toBe('hello');
    expect(result.error).toBeNull();
    expect(result.resolved).toBe(true);
    expect(result.rejected).toBe(false);
  });

  test('returns rejected result on failure', async () => {
    const result = await invokeAsync(async () => {
      throw new Error('async boom');
    });
    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('async boom');
    expect(result.resolved).toBe(false);
    expect(result.rejected).toBe(true);
  });
});
