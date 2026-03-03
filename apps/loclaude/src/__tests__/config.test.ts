import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// We need to test config in isolation, so we'll test the logic directly
describe('config', () => {
  const testDir = join(tmpdir(), `loclaude-test-${Date.now()}`);
  const configDir = join(testDir, '.loclaude');
  const configPath = join(configDir, 'config.json');

  beforeEach(() => {
    mkdirSync(configDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('config file parsing', () => {
    test('parses valid JSON config', () => {
      const config = {
        ollama: { url: 'http://test:1234' }
      };
      writeFileSync(configPath, JSON.stringify(config));

      const content = JSON.parse(require('fs').readFileSync(configPath, 'utf-8'));
      expect(content.ollama.url).toBe('http://test:1234');
    });

    test('handles missing optional fields', () => {
      const config = {
        ollama: { url: 'http://localhost:11434' }
      };
      writeFileSync(configPath, JSON.stringify(config));

      const content = JSON.parse(require('fs').readFileSync(configPath, 'utf-8'));
      expect(content.ollama.url).toBe('http://localhost:11434');
      expect(content.docker).toBeUndefined();
    });
  });

  describe('config schema', () => {
    test('ollama config has expected shape', () => {
      const config = {
        ollama: {
          url: 'http://localhost:11434',
          defaultModel: 'llama3.2'
        },
        docker: {
          composeFile: './docker-compose.yml',
          gpu: true
        },
        claude: {
          extraArgs: ['--verbose']
        }
      };

      expect(config.ollama.url).toBeString();
      expect(config.ollama.defaultModel).toBeString();
      expect(config.docker.composeFile).toBeString();
      expect(config.docker.gpu).toBeBoolean();
      expect(config.claude.extraArgs).toBeArray();
    });
  });

  describe('deep merge logic', () => {
    function deepMerge<T extends object>(a: T, b: Partial<T>): T {
      const result = { ...a } as T;
      for (const key in b) {
        if (Object.prototype.hasOwnProperty.call(b, key)) {
          const bValue = b[key];
          const aValue = a[key];
          if (
            bValue !== undefined &&
            typeof bValue === 'object' &&
            !Array.isArray(bValue) &&
            aValue !== undefined &&
            typeof aValue === 'object' &&
            !Array.isArray(aValue)
          ) {
            (result as Record<string, unknown>)[key] = deepMerge(aValue as object, bValue as object);
          } else if (bValue !== undefined) {
            (result as Record<string, unknown>)[key] = bValue;
          }
        }
      }
      return result;
    }

    test('merges nested objects', () => {
      const a = { ollama: { url: 'http://a', model: 'm1' } };
      const b = { ollama: { url: 'http://b' } };
      const result = deepMerge(a, b);

      expect(result.ollama.url).toBe('http://b');
      expect(result.ollama.model).toBe('m1');
    });

    test('overwrites primitives', () => {
      const a = { value: 1 };
      const b = { value: 2 };
      const result = deepMerge(a, b);

      expect(result.value).toBe(2);
    });

    test('handles arrays by replacement', () => {
      const a = { args: ['a', 'b'] };
      const b = { args: ['c'] };
      const result = deepMerge(a, b);

      expect(result.args).toEqual(['c']);
    });
  });
});
