import type { AIProvider } from "./provider";
import { StubAdapter } from "./stub-adapter";
import { OpenRouterAdapter } from "./openrouter-adapter";

let _provider: AIProvider | null = null;

/** Returns the configured AI provider singleton. */
export function getAIProvider(): AIProvider {
  if (_provider) return _provider;

  const providerName = process.env.AI_PROVIDER ?? "openrouter";
  const enableAI = process.env.ENABLE_AI !== "false";

  if (!enableAI || providerName === "stub") {
    _provider = new StubAdapter();
    return _provider;
  }

  if (providerName === "openrouter") {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
    _provider = new OpenRouterAdapter(apiKey);
    return _provider;
  }

  throw new Error(`Unknown AI provider: ${providerName}`);
}

export type { AIProvider, AIMessage, AIGenerateOptions, AIProviderResult } from "./provider";
