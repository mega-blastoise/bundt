import { describe, expect, test } from 'bun:test';
import { createAttempt, AttemptState } from '../attempt';

describe('createAttempt', () => {
  test('runSync succeeds and updates state', () => {
    let called = false;
    const attempt = createAttempt(() => {
      called = true;
    });

    expect(attempt.state()).toBe(AttemptState.IDLE);
    attempt.runSync();
    expect(called).toBe(true);
    expect(attempt.state()).toBe(AttemptState.SUCCEEDED);
  });

  test('runSync throws and sets FAILED state', () => {
    const attempt = createAttempt(() => {
      throw new Error('fail');
    });

    expect(() => attempt.runSync()).toThrow('fail');
    expect(attempt.state()).toBe(AttemptState.FAILED);
  });

  test('run async succeeds', async () => {
    let called = false;
    const attempt = createAttempt(async () => {
      called = true;
    });

    await attempt.run();
    expect(called).toBe(true);
    expect(attempt.state()).toBe(AttemptState.SUCCEEDED);
  });

  test('retries on failure up to configured count', () => {
    let calls = 0;
    const attempt = createAttempt(() => {
      calls++;
      if (calls < 3) throw new Error('retry me');
    }, { retries: 2 });

    attempt.runSync();
    expect(calls).toBe(3);
    expect(attempt.state()).toBe(AttemptState.SUCCEEDED);
  });

  test('retries exhausted throws and sets FAILED', () => {
    const errors: Error[] = [];
    const attempt = createAttempt(() => {
      throw new Error('always');
    }, {
      retries: 1,
      onError: (e) => errors.push(e)
    });

    expect(() => attempt.runSync()).toThrow('always');
    expect(attempt.state()).toBe(AttemptState.FAILED);
    expect(errors).toHaveLength(2);
  });

  test('state transitions through RETRYING on retries', async () => {
    const states: string[] = [];
    let calls = 0;
    const attempt = createAttempt(() => {
      states.push(attempt.state());
      calls++;
      if (calls < 2) throw new Error('retry');
    }, { retries: 1 });

    attempt.runSync();
    expect(states).toEqual([AttemptState.IN_PROGRESS, AttemptState.RETRYING]);
  });
});
