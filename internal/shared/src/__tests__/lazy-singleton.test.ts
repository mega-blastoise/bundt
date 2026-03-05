import { describe, expect, test } from 'bun:test';
import { createLazySingleton } from '../lazy-singleton';

describe('createLazySingleton', () => {
  test('getInstance returns same instance on repeated calls', () => {
    const singleton = createLazySingleton(() => ({ value: Math.random() }));
    const a = singleton.getInstance();
    const b = singleton.getInstance();
    expect(a).toBe(b);
  });

  test('hasInstance returns false before first call', () => {
    const singleton = createLazySingleton(() => 42);
    expect(singleton.hasInstance()).toBe(false);
  });

  test('hasInstance returns true after getInstance', () => {
    const singleton = createLazySingleton(() => 42);
    singleton.getInstance();
    expect(singleton.hasInstance()).toBe(true);
  });

  test('clearInstance resets so next getInstance creates new', () => {
    let count = 0;
    const singleton = createLazySingleton(() => {
      count++;
      return count;
    });

    expect(singleton.getInstance()).toBe(1);
    singleton.clearInstance();
    expect(singleton.hasInstance()).toBe(false);
    expect(singleton.getInstance()).toBe(2);
  });

  test('passes args to factory on first call', () => {
    const singleton = createLazySingleton(
      (prefix: unknown) => `${prefix}-item`
    );
    expect(singleton.getInstance('test')).toBe('test-item');
  });
});
