import { select } from '@inquirer/prompts';
import bytes from 'bytes';
import { getOllamaUrl, getClaudeExtraArgs } from './config';
import { info, success, warn, dim, magenta, cyan, loading } from './output';
import { spawn } from './spawn';
import type { OllamaModel, OllamaTagsResponse, OllamaPsResponse, RunningModel } from './types';

// =============================================================================
// Model Fetching
// =============================================================================

/**
 * Fetch available models from Ollama API
 */
export async function fetchOllamaModels(): Promise<OllamaModel[]> {
  const ollamaUrl = getOllamaUrl();
  const response = await fetch(`${ollamaUrl}/api/tags`);
  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`);
  }
  const data = (await response.json()) as OllamaTagsResponse;
  return data.models ?? [];
}

/**
 * Fetch currently running/loaded models from Ollama API
 */
export async function fetchRunningModels(): Promise<RunningModel[]> {
  const ollamaUrl = getOllamaUrl();
  try {
    const response = await fetch(`${ollamaUrl}/api/ps`, {
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as OllamaPsResponse;
    return data.models ?? [];
  } catch (error) {
    return [];
  }
}

/**
 * Check if a specific model is currently loaded in memory
 */
export async function isModelLoaded(modelName: string): Promise<boolean> {
  const runningModels = await fetchRunningModels();

  // Check for exact match or partial match (e.g., "qwen3-coder:30b" matches "qwen3-coder:30b")
  return runningModels.some(
    (m) =>
      m.model === modelName ||
      m.name === modelName ||
      m.model.startsWith(modelName + ':') ||
      modelName.startsWith(m.model)
  );
}

/**
 * Load a model into memory with specified keep_alive duration
 * Sends an empty prompt to trigger model loading
 */
export async function loadModel(modelName: string, keepAlive: string = '10m'): Promise<void> {
  const ollamaUrl = getOllamaUrl();

  const response = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelName,
      prompt: '',
      stream: false,
      keep_alive: keepAlive
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to load model: ${response.statusText}`);
  }

  // Wait for response to ensure model is loaded
  await response.json();
}

/**
 * Ensure a model is loaded, loading it if necessary
 * Shows progress while loading
 */
export async function ensureModelLoaded(modelName: string): Promise<void> {
  const isLoaded = await isModelLoaded(modelName);

  if (isLoaded) {
    console.log(dim(`  Model ${magenta(modelName)} is already loaded`));
    return;
  }

  console.log(info(`Loading model ${magenta(modelName)}...`));
  console.log(dim('  This may take a moment on first run'));

  try {
    await loadModel(modelName, '10m');
    console.log(success(`Model ${magenta(modelName)} loaded (keep_alive: 10m)`));
  } catch (error) {
    console.log(warn(`Could not pre-load model (will load on first request)`));
    console.log(dim(`  ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
}

// =============================================================================
// Model Selection
// =============================================================================

/**
 * Interactive model selection prompt
 */
export async function selectModelInteractively(): Promise<string> {
  const ollamaUrl = getOllamaUrl();
  let models: OllamaModel[];

  try {
    models = await fetchOllamaModels();
  } catch (error) {
    console.log(warn(`Could not connect to Ollama at ${ollamaUrl}`));
    console.log(dim('  Make sure Ollama is running: loclaude docker-up'));
    process.exit(1);
  }

  if (models.length === 0) {
    console.log(warn('No models found in Ollama.'));
    console.log(dim('  Pull a model first: loclaude models-pull <model-name>'));
    process.exit(1);
  }

  // Fetch running models to show which are loaded
  const runningModels = await fetchRunningModels();
  const loadedModelNames = new Set(runningModels.map((m) => m.model));

  const selected = await select({
    message: 'Select a model',
    choices: models.map((model) => {
      const isLoaded = loadedModelNames.has(model.name);
      const loadedIndicator = isLoaded ? ' [loaded]' : '';
      return {
        name: `${model.name} (${bytes(model.size)})${loadedIndicator}`,
        value: model.name
      };
    })
  });

  return selected;
}

// =============================================================================
// Claude Launcher
// =============================================================================

/**
 * Launch Claude with Ollama configuration
 */
export async function launchClaude(model: string, passthroughArgs: string[]) {
  const ollamaUrl = getOllamaUrl();
  const extraArgs = getClaudeExtraArgs();

  console.log('');
  console.log(cyan('Launching Claude Code with Ollama'));
  console.log(dim(`  Model: ${magenta(model)}`));
  console.log(dim(`  API:   ${ollamaUrl}`));
  console.log('');

  // Ensure the model is loaded before launching Claude
  await ensureModelLoaded(model);
  console.log('');

  const env: Record<string, string | undefined> = {
    ...process.env,
    ANTHROPIC_AUTH_TOKEN: 'ollama',
    ANTHROPIC_BASE_URL: ollamaUrl
  };

  const claudeArgs = ['claude', '--model', model, ...extraArgs, ...passthroughArgs];
  const exitCode = await spawn(claudeArgs, { env });
  process.exit(exitCode);
}
