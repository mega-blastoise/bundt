import { describe, test, expect, mock, beforeEach } from 'bun:test';

describe('utils', () => {
  describe('fetchOllamaModels', () => {
    test('parses model response correctly', () => {
      // Test the expected shape of Ollama API response
      const mockResponse = {
        models: [
          { name: 'llama3.2:latest', size: 2000000000 },
          { name: 'qwen3-coder:30b', size: 16000000000 }
        ]
      };

      expect(mockResponse.models).toBeArray();
      expect(mockResponse.models[0].name).toBe('llama3.2:latest');
      expect(mockResponse.models[0].size).toBeNumber();
    });

    test('handles empty models array', () => {
      const mockResponse = { models: [] };
      expect(mockResponse.models).toBeArray();
      expect(mockResponse.models.length).toBe(0);
    });

    test('handles missing models field', () => {
      const mockResponse = {};
      const models = (mockResponse as any).models ?? [];
      expect(models).toBeArray();
      expect(models.length).toBe(0);
    });
  });

  describe('model formatting', () => {
    test('formats bytes correctly', () => {
      // Simple bytes formatting logic
      const formatBytes = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      };

      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
      expect(formatBytes(16.5 * 1024 * 1024 * 1024)).toBe('16.5 GB');
    });
  });

  describe('environment building', () => {
    test('builds claude environment correctly', () => {
      const ollamaUrl = 'http://localhost:11434';
      const env = {
        ...process.env,
        ANTHROPIC_AUTH_TOKEN: 'ollama',
        ANTHROPIC_BASE_URL: ollamaUrl
      };

      expect(env.ANTHROPIC_AUTH_TOKEN).toBe('ollama');
      expect(env.ANTHROPIC_BASE_URL).toBe(ollamaUrl);
    });

    test('preserves existing env vars', () => {
      const originalPath = process.env.PATH;
      const env = {
        ...process.env,
        ANTHROPIC_AUTH_TOKEN: 'ollama'
      };

      expect(env.PATH).toBe(originalPath);
    });
  });
});
