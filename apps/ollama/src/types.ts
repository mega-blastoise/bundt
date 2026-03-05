/**
 * Type definitions for Ollama API responses
 */

// =============================================================================
// Models API (/api/tags)
// =============================================================================

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
}

export interface OllamaTagsResponse {
  models: OllamaModel[];
}

// =============================================================================
// Running Models API (/api/ps)
// =============================================================================

export interface RunningModel {
  /** Model identifier */
  model: string;
  /** Model name */
  name: string;
  /** Size in VRAM (bytes) */
  size_vram: number;
  /** Digest hash */
  digest: string;
  /** When the model will be unloaded */
  expires_at: string;
  /** Model details */
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaPsResponse {
  models: RunningModel[];
}

// =============================================================================
// Generate API (/api/generate)
// =============================================================================

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  keep_alive?: string;
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  done_reason?: string;
}
