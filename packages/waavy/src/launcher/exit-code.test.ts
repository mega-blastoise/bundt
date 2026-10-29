import { constants } from 'node:os';

import { describe, expect, test } from 'bun:test';

import { exitCodeFor } from './exit-code';

describe('exitCodeFor', () => {
  test('passes exit codes through, including waavy error codes', () => {
    expect(exitCodeFor(0, null, constants.signals)).toBe(0);
    expect(exitCodeFor(11, null, constants.signals)).toBe(11);
  });

  test('maps death by signal to 128 + the signal number', () => {
    expect(exitCodeFor(null, 'SIGTERM', constants.signals)).toBe(128 + constants.signals.SIGTERM);
    expect(exitCodeFor(null, 'SIGKILL', constants.signals)).toBe(137);
  });

  test('falls back to 1 when neither is meaningful', () => {
    expect(exitCodeFor(null, null, constants.signals)).toBe(1);
    expect(exitCodeFor(null, 'SIGNOPE', constants.signals)).toBe(1);
  });
});
