import type { AIProvider } from "./types";
import { MockAdapter } from "./mock-adapter";
import { OpenRouterAdapter } from "./openrouter-adapter";

let _provider: AIProvider | null = null;

/**
 * Returns the configured AI provider singleton. Use AI_PROVIDER=mock for local (no API key); openrouter for real AI.
 */
export function getAIProvider(): AIProvider {
  if (_provider) return _provider;

  const providerName = process.env.AI_PROVIDER ?? "mock";
  const enableAI = process.env.ENABLE_AI !== "false";

  if (!enableAI || providerName === "mock") {
    _provider = new MockAdapter();
    return _provider;
  }

  if (providerName === "openrouter") {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is required when AI_PROVIDER=openrouter");
    _provider = new OpenRouterAdapter({
      apiKey,
      siteUrl: process.env.OPENROUTER_SITE_URL ?? "https://frame-mirror.app",
      siteName: process.env.OPENROUTER_SITE_NAME ?? "Frame + Mirror",
    });
    return _provider;
  }

  throw new Error(`Unknown AI provider: ${providerName}. Use mock or openrouter.`);
}

export { isRawFallback } from "./types";
export type {
  AIProvider,
  GenerateQuestionsInput,
  GenerateQuestionsOutput,
  GenerateBriefInput,
  FrameBrief,
  FrameBriefStructured,
  GenerateOverlayInput,
  MirrorOverlay,
  MirrorOverlayStructured,
  RawFallback,
  AIFailure,
  Result,
} from "./types";
