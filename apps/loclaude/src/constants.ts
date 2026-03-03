/**
 * Constants - Loaded from configuration system
 *
 * Values come from (in priority order):
 * 1. Environment variables (OLLAMA_URL, OLLAMA_MODEL)
 * 2. Project config (.loclaude/config.json)
 * 3. User config (~/.config/loclaude/config.json)
 * 4. Default values
 */

import { getOllamaUrl, getDefaultModel } from './config';

export const OLLAMA_URL = getOllamaUrl();
export const DEFAULT_MODEL = getDefaultModel();
