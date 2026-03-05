import { describe, expect, test } from 'bun:test';
import { createOption } from '../option';

describe('createOption', () => {
  test('resolve returns resolved outcome on success', async () => {
    const opt = createOption(() => 42);
    const result = await opt.resolve();
    expect(result.state).toBe('resolved');
    expect(result.data).toBe(42);
  });

  test('resolve returns rejected outcome on failure', async () => {
    const opt = createOption(() => {
      throw new Error('fail');
    });
    const result = await opt.resolve();
    expect(result.state).toBe('rejected');
    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('fail');
  });

  test('resolveSync works synchronously', () => {
    const opt = createOption(() => 'sync');
    const result = opt.resolveSync();
    expect(result.state).toBe('resolved');
    expect(result.data).toBe('sync');
  });

  test('match calls some on success', async () => {
    const opt = createOption(() => 10);
    const result = await opt.match(
      (o) => `got ${o.data}`,
      (o) => `err ${o.error?.message}`
    );
    expect(result).toBe('got 10');
  });

  test('match calls none on failure', async () => {
    const opt = createOption(() => {
      throw new Error('nope');
    });
    const result = await opt.match(
      () => 'ok',
      (o) => `err: ${o.error?.message}`
    );
    expect(result).toBe('err: nope');
  });

  test('matchSync works synchronously', () => {
    const opt = createOption(() => 5);
    const result = opt.matchSync(
      (o) => o.data,
      () => null
    );
    expect(result).toBe(5);
  });

  test('peek returns idle before resolve', () => {
    const opt = createOption(() => 1);
    expect(opt.peek().state).toBe('idle');
  });

  test('peek returns last outcome after resolve', () => {
    const opt = createOption(() => 99);
    opt.resolveSync();
    expect(opt.peek().state).toBe('resolved');
    expect(opt.peek().data).toBe(99);
  });

  test('retries on failure up to configured count', () => {
    let attempts = 0;
    const opt = createOption(() => {
      attempts++;
      if (attempts < 3) throw new Error('not yet');
      return 'done';
    }, { retries: 2 });

    const result = opt.resolveSync();
    expect(result.state).toBe('resolved');
    expect(result.data).toBe('done');
    expect(attempts).toBe(3);
  });

  test('retries exhausted returns rejected', () => {
    const opt = createOption(() => {
      throw new Error('always fails');
    }, { retries: 2 });

    const result = opt.resolveSync();
    expect(result.state).toBe('rejected');
    expect(result.error?.message).toBe('always fails');
  });
});
