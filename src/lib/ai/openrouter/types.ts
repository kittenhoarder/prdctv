/**
 * OpenRouter API types for the free-tier model discovery and chat completion pipeline.
 * These mirror the OpenRouter REST API shapes used by model-discovery and the adapter.
 */

export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: { prompt: string; completion: string };
  top_provider?: { max_completion_tokens?: number };
  architecture?: {
    modality: string;
    instruct_type?: string;
    tokenizer?: string;
  };
}

export interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

export interface ScoredModel {
  model: OpenRouterModel;
  score: number;
}

export interface ModelHealthRecord {
  outcomes: Array<{ success: boolean; timestamp: number; latencyMs?: number }>;
  rateLimitedUntil: number | null;
  incompatible: boolean;
}

export interface ChatCompletionRequest {
  models: string[];
  messages: Array<{ role: "user"; content: string }>;
  temperature: number;
  max_tokens: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface ChatCompletionResponse {
  id?: string;
  model?: string;
  choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  error?: { message?: string; code?: number };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AdapterConfig {
  /** One or more OpenRouter API keys. The adapter distributes calls across all keys via round-robin. */
  apiKeys: string[];
  siteUrl: string;
  siteName: string;
}
