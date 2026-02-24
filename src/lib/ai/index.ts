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
    // Prefer OPENROUTER_API_KEYS (comma-separated) when set — works when the runtime
    // does not expose OPENROUTER_API_KEY_1.._10 (e.g. some Next.js / serverless setups).
    const keysFromList = process.env.OPENROUTER_API_KEYS?.split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0) ?? [];

    const apiKeys =
      keysFromList.length > 0
        ? keysFromList
        : [
            process.env.OPENROUTER_API_KEY,
            process.env.OPENROUTER_API_KEY_1,
            process.env.OPENROUTER_API_KEY_2,
            process.env.OPENROUTER_API_KEY_3,
            process.env.OPENROUTER_API_KEY_4,
            process.env.OPENROUTER_API_KEY_5,
            process.env.OPENROUTER_API_KEY_6,
            process.env.OPENROUTER_API_KEY_7,
            process.env.OPENROUTER_API_KEY_8,
            process.env.OPENROUTER_API_KEY_9,
            process.env.OPENROUTER_API_KEY_10,
          ].filter((k): k is string => typeof k === "string" && k.trim().length > 0);

    if (apiKeys.length === 0) {
      throw new Error("OPENROUTER_API_KEY or OPENROUTER_API_KEYS is required when AI_PROVIDER=openrouter");
    }

    _provider = new OpenRouterAdapter({
      apiKeys,
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
