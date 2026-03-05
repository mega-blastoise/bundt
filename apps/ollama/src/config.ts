/**
 * Configuration system for ollama-bundt
 *
 * Priority (highest to lowest):
 * 1. CLI arguments
 * 2. Environment variables
 * 3. Project config (./.ollama-bundt/config.json)
 * 4. User config (~/.config/ollama-bundt/config.json)
 * 5. Default values
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// =============================================================================
// Types
// =============================================================================

export interface OllamaConfig {
  url: string;
  defaultModel: string;
}

export interface ModelsConfig {
  path: string;
}

export interface DockerConfig {
  composeFile: string;
  gpu: boolean;
}

export interface ClaudeConfig {
  extraArgs: string[];
}

export interface LoclaudeConfig {
  ollama: OllamaConfig;
  models: ModelsConfig;
  docker: DockerConfig;
  claude: ClaudeConfig;
}

// Partial version for user configs (all fields optional)
export interface LoclaudeConfigPartial {
  ollama?: Partial<OllamaConfig>;
  models?: Partial<ModelsConfig>;
  docker?: Partial<DockerConfig>;
  claude?: Partial<ClaudeConfig>;
}

// =============================================================================
// Defaults
// =============================================================================

const DEFAULT_CONFIG: LoclaudeConfig = {
  ollama: {
    url: 'http://localhost:11434',
    defaultModel: 'qwen3-coder:30b'
  },
  models: {
    path: join(homedir(), '.ollama-bundt', 'models')
  },
  docker: {
    composeFile: './docker-compose.yml',
    gpu: true
  },
  claude: {
    extraArgs: []
  }
};

// =============================================================================
// Config file locations
// =============================================================================

/**
 * Get paths to check for config files (in priority order)
 */
function getConfigPaths(): string[] {
  const paths: string[] = [];

  // 1. Project-local config
  const projectConfig = join(process.cwd(), '.ollama-bundt', 'config.json');
  paths.push(projectConfig);

  // 2. User global config
  const userConfig = join(homedir(), '.config', 'ollama-bundt', 'config.json');
  paths.push(userConfig);

  return paths;
}

/**
 * Find the first existing config file
 */
function findConfigFile(): string | null {
  for (const path of getConfigPaths()) {
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

// =============================================================================
// Config loading
// =============================================================================

/**
 * Load and parse a config file
 */
function loadConfigFile(path: string): LoclaudeConfigPartial | null {
  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as LoclaudeConfigPartial;
  } catch (error) {
    console.warn(`Warning: Failed to parse config file ${path}`);
    return null;
  }
}

/**
 * Load all config files and merge them (project overrides user)
 */
function loadConfigFiles(): LoclaudeConfigPartial {
  const paths = getConfigPaths();
  let merged: LoclaudeConfigPartial = {};

  // Load in reverse order so project config overrides user config
  for (const path of paths.reverse()) {
    if (existsSync(path)) {
      const config = loadConfigFile(path);
      if (config) {
        merged = deepMerge(merged, config);
      }
    }
  }

  return merged;
}

/**
 * Get config values from environment variables
 */
function loadEnvConfig(): LoclaudeConfigPartial {
  const config: LoclaudeConfigPartial = {};

  // Ollama config from env
  if (process.env.OLLAMA_URL) {
    config.ollama = config.ollama || {};
    config.ollama.url = process.env.OLLAMA_URL;
  }
  if (process.env.OLLAMA_MODEL) {
    config.ollama = config.ollama || {};
    config.ollama.defaultModel = process.env.OLLAMA_MODEL;
  }

  // Docker config from env
  if (process.env.OLLAMA_BUNDT_COMPOSE_FILE) {
    config.docker = config.docker || {};
    config.docker.composeFile = process.env.OLLAMA_BUNDT_COMPOSE_FILE;
  }
  if (process.env.OLLAMA_BUNDT_GPU !== undefined) {
    config.docker = config.docker || {};
    config.docker.gpu = process.env.OLLAMA_BUNDT_GPU !== 'false' && process.env.OLLAMA_BUNDT_GPU !== '0';
  }

  // Models config from env
  if (process.env.OLLAMA_BUNDT_MODELS_PATH) {
    config.models = config.models || {};
    config.models.path = process.env.OLLAMA_BUNDT_MODELS_PATH;
  }

  return config;
}

// =============================================================================
// Merging utilities
// =============================================================================

/**
 * Deep merge two objects (b overrides a)
 */
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

/**
 * Merge partial config with defaults
 */
function mergeWithDefaults(partial: LoclaudeConfigPartial): LoclaudeConfig {
  return {
    ollama: {
      ...DEFAULT_CONFIG.ollama,
      ...partial.ollama
    },
    models: {
      ...DEFAULT_CONFIG.models,
      ...partial.models
    },
    docker: {
      ...DEFAULT_CONFIG.docker,
      ...partial.docker
    },
    claude: {
      ...DEFAULT_CONFIG.claude,
      ...partial.claude
    }
  };
}

// =============================================================================
// Public API
// =============================================================================

let cachedConfig: LoclaudeConfig | null = null;

/**
 * Load the full configuration
 *
 * Merges (in order of priority):
 * 1. Environment variables
 * 2. Project config file
 * 3. User config file
 * 4. Defaults
 */
export function loadConfig(): LoclaudeConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Load from files (user config, then project config)
  const fileConfig = loadConfigFiles();

  // Load from environment (highest priority)
  const envConfig = loadEnvConfig();

  // Merge: defaults <- file config <- env config
  const merged = deepMerge(fileConfig, envConfig);
  cachedConfig = mergeWithDefaults(merged);

  return cachedConfig;
}

/**
 * Clear the config cache (useful for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

/**
 * Get the path to the active config file (if any)
 */
export function getActiveConfigPath(): string | null {
  return findConfigFile();
}

/**
 * Get all config paths that are checked
 */
export function getConfigSearchPaths(): string[] {
  return getConfigPaths();
}

// =============================================================================
// Convenience getters
// =============================================================================

/**
 * Get Ollama URL from config
 */
export function getOllamaUrl(): string {
  return loadConfig().ollama.url;
}

/**
 * Get default model from config
 */
export function getDefaultModel(): string {
  return loadConfig().ollama.defaultModel;
}

/**
 * Get docker compose file path from config
 */
export function getComposeFile(): string {
  return loadConfig().docker.composeFile;
}

/**
 * Check if GPU is enabled in config
 */
export function isGpuEnabled(): boolean {
  return loadConfig().docker.gpu;
}

/**
 * Get extra Claude args from config
 */
export function getClaudeExtraArgs(): string[] {
  return loadConfig().claude.extraArgs;
}

/**
 * Get the models storage path from config
 */
export function getModelsPath(): string {
  return loadConfig().models.path;
}