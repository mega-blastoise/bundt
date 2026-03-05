import { describe, expect, test } from 'bun:test';
import { createTimer, benchmark } from '../timer';

describe('createTimer', () => {
  test('elapsed is null before start/stop', () => {
    const timer = createTimer();
    expect(timer.elapsed()).toBeNull();
  });

  test('start and stop records elapsed time', () => {
    const timer = createTimer();
    timer.start();
    let sum = 0;
    for (let i = 0; i < 1000; i++) sum += i;
    timer.stop();
    const ms = timer.elapsed();
    expect(ms).not.toBeNull();
    expect(ms!).toBeGreaterThanOrEqual(0);
  });

  test('reset clears elapsed', () => {
    const timer = createTimer();
    timer.start();
    timer.stop();
    expect(timer.elapsed()).not.toBeNull();
    timer.reset();
    expect(timer.elapsed()).toBeNull();
  });

  test('stop without start does nothing', () => {
    const timer = createTimer();
    timer.stop();
    expect(timer.elapsed()).toBeNull();
  });
});

describe('benchmark', () => {
  test('runs iterations and returns results', () => {
    let count = 0;
    const b = benchmark(() => {
      count++;
    }, 100);

    b.run();
    expect(count).toBe(100);
    expect(b.results()).toHaveLength(100);
  });

  test('average returns mean of timings', () => {
    const b = benchmark(() => {}, 10);
    b.run();
    const avg = b.average();
    expect(avg).toBeGreaterThanOrEqual(0);
  });

  test('average returns 0 before run', () => {
    const b = benchmark(() => {}, 5);
    expect(b.average()).toBe(0);
  });

  test('results returns copy of timings', () => {
    const b = benchmark(() => {}, 3);
    b.run();
    const r1 = b.results();
    const r2 = b.results();
    expect(r1).toEqual(r2);
    expect(r1).not.toBe(r2);
  });
});
