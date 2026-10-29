import { describe, expect, test } from 'bun:test';

import packageJson from '../../package.json';
import { WAAVY_VERSION } from './version';

describe('WAAVY_VERSION', () => {
  test('matches package.json', () => {
    expect(WAAVY_VERSION).toBe(packageJson.version);
  });
});
