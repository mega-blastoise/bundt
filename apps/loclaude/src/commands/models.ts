/**
 * models command - Manage Ollama models
 */

import bytes from 'bytes';
import { getOllamaUrl } from '../config';
import {
  header,
  success,
  error,
  info,
  dim,
  bold,
  cyan,
  yellow,
  green,
  magenta,
  tableHeader,
  cmd
} from '../output';
import type { OllamaModel, OllamaTagsResponse } from '../types';
import { spawn, spawnCapture } from '../spawn';

/**
 * Fetch models from Ollama API
 */
async function fetchModels(): Promise<OllamaModel[]> {
  const ollamaUrl = getOllamaUrl();
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as OllamaTagsResponse;
    return data.models ?? [];
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error(`Connection to Ollama timed out (${ollamaUrl})`);
    }
    throw error;
  }
}

/**
 * Check if Ollama is running in Docker
 */
async function isOllamaInDocker(): Promise<boolean> {
  const result = await spawnCapture(['docker', 'ps', '--filter', 'name=ollama', '--format', '{{.Names}}']);
  return result.exitCode === 0 && (result.stdout?.includes('ollama') ?? false);
}

/**
 * Run ollama command (via docker if container exists, otherwise direct)
 */
async function runOllamaCommand(args: string[]): Promise<number> {
  const inDocker = await isOllamaInDocker();

  if (inDocker) {
    return spawn(['docker', 'exec', '-it', 'ollama', 'ollama', ...args]);
  } else {
    return spawn(['ollama', ...args]);
  }
}

/**
 * Format size with color based on magnitude
 */
function formatSize(sizeBytes: number): string {
  const sizeStr = bytes(sizeBytes) ?? '?';
  const sizeNum = sizeBytes / (1024 * 1024 * 1024); // Convert to GB

  if (sizeNum > 20) {
    return yellow(sizeStr); // Large models (>20GB) in yellow
  } else if (sizeNum > 10) {
    return cyan(sizeStr); // Medium models (10-20GB) in cyan
  }
  return dim(sizeStr); // Small models in dim
}

export async function modelsList(): Promise<void> {
  try {
    const models = await fetchModels();

    if (models.length === 0) {
      header('Installed Models');
      console.log('');
      console.log(info('No models installed.'));
      console.log('');
      console.log(`Pull a model with: ${cmd('loclaude models-pull <model-name>')}`);
      console.log(`Example: ${cmd('loclaude models-pull llama3.2')}`);
      return;
    }

    header('Installed Models');
    console.log('');

    // Calculate column widths
    const nameWidth = Math.max(...models.map((m) => m.name.length), 'NAME'.length);
    const sizeWidth = 10;
    const modifiedWidth = 20;

    // Header
    tableHeader(['NAME', 'SIZE', 'MODIFIED'], [nameWidth, sizeWidth, modifiedWidth]);

    // Rows
    for (const model of models) {
      const name = magenta(model.name.padEnd(nameWidth));
      const size = formatSize(model.size).padStart(sizeWidth);
      const modified = dim(formatRelativeTime(model.modified_at));
      console.log(`${name}  ${size}  ${modified}`);
    }

    console.log('');
    console.log(dim(`${models.length} model(s) installed`));
  } catch (err) {
    const ollamaUrl = getOllamaUrl();
    console.log(error(`Could not connect to Ollama at ${ollamaUrl}`));
    console.log(dim(`  Make sure Ollama is running: ${cmd('loclaude docker-up')}`));
    process.exit(1);
  }
}

export async function modelsPull(modelName: string): Promise<void> {
  if (!modelName) {
    console.log(error('Model name required'));
    console.log(dim(`Usage: ${cmd('loclaude models-pull <model-name>')}`));
    console.log(dim(`Example: ${cmd('loclaude models-pull llama3.2')}`));
    process.exit(1);
  }

  console.log(info(`Pulling model: ${magenta(modelName)}`));
  console.log('');
  const exitCode = await runOllamaCommand(['pull', modelName]);

  if (exitCode === 0) {
    console.log('');
    console.log(success(`Model '${magenta(modelName)}' pulled successfully`));
  }

  process.exit(exitCode);
}

export async function modelsRm(modelName: string): Promise<void> {
  if (!modelName) {
    console.log(error('Model name required'));
    console.log(dim(`Usage: ${cmd('loclaude models-rm <model-name>')}`));
    process.exit(1);
  }

  console.log(info(`Removing model: ${magenta(modelName)}`));
  console.log('');
  const exitCode = await runOllamaCommand(['rm', modelName]);

  if (exitCode === 0) {
    console.log('');
    console.log(success(`Model '${magenta(modelName)}' removed`));
  }

  process.exit(exitCode);
}

export async function modelsShow(modelName: string): Promise<void> {
  if (!modelName) {
    console.log(error('Model name required'));
    console.log(dim(`Usage: ${cmd('loclaude models-show <model-name>')}`));
    process.exit(1);
  }

  console.log(info(`Model details: ${magenta(modelName)}`));
  console.log('');
  const exitCode = await runOllamaCommand(['show', modelName]);
  process.exit(exitCode);
}

export async function modelsRun(modelName: string): Promise<void> {
  if (!modelName) {
    console.log(error('Model name required'));
    console.log(dim(`Usage: ${cmd('loclaude models-run <model-name>')}`));
    process.exit(1);
  }

  console.log(info(`Running model: ${magenta(modelName)}`));
  console.log('');
  const exitCode = await runOllamaCommand(['run', modelName]);
  process.exit(exitCode);
}

/**
 * Format a date string as relative time
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString();
}
