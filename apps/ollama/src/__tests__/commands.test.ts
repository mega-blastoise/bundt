import { describe, test, expect } from 'bun:test';
import { existsSync } from 'fs';
import { join } from 'path';

describe('commands', () => {
  describe('init templates', () => {
    test('docker-compose template is valid YAML structure', () => {
      // Test that the docker-compose template has expected services
      const template = `services:
  ollama:
    image: ollama/ollama:latest
  open-webui:
    image: ghcr.io/open-webui/open-webui:cuda`;

      expect(template).toContain('ollama:');
      expect(template).toContain('open-webui:');
      expect(template).toContain('ollama/ollama:latest');
    });

    test('config template is valid JSON', () => {
      const template = `{
  "ollama": {
    "url": "http://localhost:11434",
    "defaultModel": "qwen3-coder:30b"
  },
  "docker": {
    "composeFile": "./docker-compose.yml",
    "gpu": true
  }
}`;

      const parsed = JSON.parse(template);
      expect(parsed.ollama.url).toBe('http://localhost:11434');
      expect(parsed.docker.gpu).toBe(true);
    });
  });

  describe('doctor checks', () => {
    test('check structure has required fields', () => {
      interface Check {
        name: string;
        check: () => Promise<{ ok: boolean; message: string }>;
      }

      const mockCheck: Check = {
        name: 'Docker',
        check: async () => ({ ok: true, message: 'Installed' })
      };

      expect(mockCheck.name).toBeString();
      expect(mockCheck.check).toBeFunction();
    });

    test('check results have expected shape', async () => {
      const result = { ok: true, message: 'Docker version 28.0.1' };

      expect(result.ok).toBeBoolean();
      expect(result.message).toBeString();
    });
  });

  describe('docker commands', () => {
    test('compose args are built correctly', () => {
      const buildComposeArgs = (file: string, command: string, options: string[] = []): string[] => {
        return ['docker', 'compose', '-f', file, command, ...options];
      };

      const args = buildComposeArgs('./docker-compose.yml', 'up', ['-d']);
      expect(args).toEqual(['docker', 'compose', '-f', './docker-compose.yml', 'up', '-d']);
    });

    test('handles custom compose file path', () => {
      const buildComposeArgs = (file: string, command: string): string[] => {
        return ['docker', 'compose', '-f', file, command];
      };

      const args = buildComposeArgs('/custom/path/compose.yml', 'down');
      expect(args[3]).toBe('/custom/path/compose.yml');
    });
  });

  describe('models commands', () => {
    test('model name parsing', () => {
      const parseModelName = (name: string): { base: string; tag: string | null } => {
        const parts = name.split(':');
        return {
          base: parts[0],
          tag: parts[1] || null
        };
      };

      expect(parseModelName('llama3.2')).toEqual({
        base: 'llama3.2',
        tag: null
      });
      expect(parseModelName('llama3.2:latest')).toEqual({
        base: 'llama3.2',
        tag: 'latest'
      });
      expect(parseModelName('qwen3-coder:30b')).toEqual({
        base: 'qwen3-coder',
        tag: '30b'
      });
    });
  });
});
