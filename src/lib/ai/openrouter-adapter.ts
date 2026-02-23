import type { AIProvider, AIGenerateOptions, AIProviderResult } from "./provider";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Use a capable model that supports JSON mode
const MODEL = "anthropic/claude-3.5-haiku";

export class OpenRouterAdapter implements AIProvider {
  constructor(private readonly apiKey: string) {}

  async generate<T>(options: AIGenerateOptions): Promise<AIProviderResult<T>> {
    const { messages, temperature, maxTokens } = options;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://frame-mirror.app",
          "X-Title": "Frame + Mirror",
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`OpenRouter error ${response.status}: ${body}`);
    }

    const json = await response.json();
    const content: string = json.choices?.[0]?.message?.content ?? "";

    let parsed: T;
    try {
      parsed = JSON.parse(content) as T;
    } catch {
      throw new Error(`Failed to parse AI response as JSON: ${content}`);
    }

    return {
      data: parsed,
      usage: {
        promptTokens: json.usage?.prompt_tokens ?? 0,
        completionTokens: json.usage?.completion_tokens ?? 0,
      },
    };
  }
}
