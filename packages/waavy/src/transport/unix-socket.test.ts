import { describe, expect, test } from 'bun:test';

import { WaavyError } from '../core/errors';
import { checkSocketPathLength, maxSocketPathBytes } from './unix-socket';

describe('socket path length', () => {
  test('limits follow sizeof(sun_path) minus the NUL', () => {
    expect(maxSocketPathBytes('darwin')).toBe(103);
    expect(maxSocketPathBytes('freebsd')).toBe(103);
    expect(maxSocketPathBytes('linux')).toBe(107);
  });

  test.each([
    ['darwin', 103],
    ['linux', 107]
  ] as const)('%s accepts exactly the limit and rejects one byte more', (platform, max) => {
    expect(() => checkSocketPathLength(`/${'a'.repeat(max - 1)}`, platform)).not.toThrow();
    const tooLong = () => checkSocketPathLength(`/${'a'.repeat(max)}`, platform);
    expect(tooLong).toThrow(WaavyError);
    expect(tooLong).toThrow(`${max + 1} bytes; ${platform} allows at most ${max}`);
  });

  test('counts bytes, not characters', () => {
    // 52 two-byte characters + "/" = 105 bytes.
    expect(() => checkSocketPathLength(`/${'é'.repeat(52)}`, 'darwin')).toThrow('105 bytes');
  });
});
