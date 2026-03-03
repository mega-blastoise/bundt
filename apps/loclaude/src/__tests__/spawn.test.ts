import { describe, test, expect } from 'bun:test';
import { spawn, spawnCapture, commandExists, getCommandVersion } from '../spawn';

describe('spawn', () => {
  describe('spawn()', () => {
    test('executes command and returns exit code', async () => {
      const exitCode = await spawn(['true']);
      expect(exitCode).toBe(0);
    });

    test('returns non-zero for failed commands', async () => {
      const exitCode = await spawn(['false']);
      expect(exitCode).toBe(1);
    });

    test('throws on empty command', async () => {
      expect(spawn([])).rejects.toThrow('No command provided');
    });
  });

  describe('spawnCapture()', () => {
    test('captures stdout', async () => {
      const result = await spawnCapture(['echo', 'hello']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout?.trim()).toBe('hello');
    });

    test('captures stderr', async () => {
      const result = await spawnCapture(['sh', '-c', 'echo error >&2']);
      expect(result.stderr?.trim()).toBe('error');
    });

    test('returns exit code on failure', async () => {
      const result = await spawnCapture(['false']);
      expect(result.exitCode).toBe(1);
    });

    test('throws on empty command', async () => {
      expect(spawnCapture([])).rejects.toThrow('No command provided');
    });
  });

  describe('commandExists()', () => {
    test('returns true for existing command', async () => {
      const exists = await commandExists('ls');
      expect(exists).toBe(true);
    });

    test('returns false for non-existing command', async () => {
      const exists = await commandExists('nonexistent-command-xyz');
      expect(exists).toBe(false);
    });
  });

  describe('getCommandVersion()', () => {
    test('returns version string for valid command', async () => {
      const version = await getCommandVersion('node');
      expect(version).toBeString();
      expect(version).toMatch(/node|v\d+/i);
    });

    test('returns null for non-existing command', async () => {
      const version = await getCommandVersion('nonexistent-command-xyz');
      expect(version).toBeNull();
    });
  });
});
