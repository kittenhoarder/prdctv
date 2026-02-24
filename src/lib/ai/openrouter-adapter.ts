import type {
  AIProvider,
  GenerateQuestionsInput,
  GenerateQuestionsOutput,
  GenerateBriefInput,
  FrameBrief,
  GenerateOverlayInput,
  MirrorOverlay,
  Result,
  AIFailure,
} from "./types";
import {
  buildQuestionsPrompt,
  QUESTIONS_SYSTEM_PROMPT,
  buildBriefPrompt,
  BRIEF_SYSTEM_PROMPT,
  buildOverlayPrompt,
  OVERLAY_SYSTEM_PROMPT,
} from "./prompts";
import { generateQuestionsOutputSchema } from "./schemas";
import type { AdapterConfig, ChatCompletionResponse } from "./openrouter/types";
import { modelSelector } from "./openrouter/model-selector";
import { modelHealthTracker } from "./openrouter/model-health";
import { KeyPool } from "./openrouter/key-pool";
import { ResponseCache, cacheKey } from "./openrouter/response-cache";
import { log } from "@/lib/logger";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_PER_MODEL_MS = 30_000;
const RETRY_DELAYS_MS = [1_000, 3_000];
const JITTER_MS = 200;
const MODEL_COUNT = 3;

function jitter(ms: number): number {
  const delta = Math.floor(Math.random() * (2 * JITTER_MS + 1)) - JITTER_MS;
  return Math.max(0, ms + delta);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Common preamble patterns that may appear before the JSON object. */
const JSON_PREAMBLE = /^(?:(?:Here'?s? (?:the |your )?(?:JSON|result|response)[.:]?\s*)|(?:Answer:?\s*)|(?:```(?:json)?\s*))/i;

/**
 * Extracts a JSON object from LLM output that may include markdown fences or preamble text.
 * Strips optional preamble, then tries direct parse, fenced block, or first balanced {...} block.
 */
function extractJson(content: string): unknown {
  let trimmed = content.trim();
  trimmed = trimmed.replace(JSON_PREAMBLE, "").trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      // Fall through
    }
  }

  const start = trimmed.indexOf("{");
  if (start === -1) throw new ValidationError("No JSON object in response");

  let depth = 0;
  for (let i = start; i < trimmed.length; i++) {
    if (trimmed[i] === "{") depth++;
    else if (trimmed[i] === "}") depth--;
    if (depth === 0) {
      try {
        return JSON.parse(trimmed.slice(start, i + 1));
      } catch {
        throw new ValidationError("Malformed JSON object in response");
      }
    }
  }

  throw new ValidationError("Unterminated JSON object in response");
}

/** Coerces parsed (or re-extracted) payload into exactly 3 question strings for display. */
function normalizeQuestionsPayload(parsed: unknown): GenerateQuestionsOutput | null {
  if (parsed === null || typeof parsed !== "object") return null;
  const q = (parsed as { questions?: unknown }).questions;
  if (!Array.isArray(q)) return null;
  const strings = q.filter((x): x is string => typeof x === "string");
  if (strings.length === 0) return null;
  const questions: [string, string, string] = [
    strings[0] ?? "",
    strings[1] ?? "",
    strings[2] ?? "",
  ];
  return { questions };
}

/**
 * Strips markdown code fences that some models wrap around plain-text responses.
 * Brief generation is intentionally freeform — no JSON parsing.
 */
function stripFences(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:\w+)?\s*([\s\S]*?)\s*```$/);
  if (fenced) return fenced[1].trim();
  return trimmed;
}

export class OpenRouterAdapter implements AIProvider {
  private readonly keyPool: KeyPool;
  private readonly siteUrl: string;
  private readonly siteName: string;
  private readonly cache = new ResponseCache<{ parsed: unknown | null; raw: string }>();

  constructor(config: AdapterConfig) {
    this.keyPool = new KeyPool(config.apiKeys);
    this.siteUrl = config.siteUrl;
    this.siteName = config.siteName;
  }

  async generateQuestions(
    input: GenerateQuestionsInput
  ): Promise<Result<GenerateQuestionsOutput, AIFailure>> {
    return this.callWithRetry<GenerateQuestionsOutput>("generateQuestions", async () => {
      let result: { parsed: unknown | null; raw: string };
      try {
        result = await this.fetchJson({
          functionName: "generateQuestions",
          system: QUESTIONS_SYSTEM_PROMPT,
          user: buildQuestionsPrompt(input),
          temperature: 0.7,
          maxTokens: 650,
        });
      } catch (e) {
        return this.toFailure(e);
      }
      if (result.parsed === null) {
        try {
          const reextracted = extractJson(result.raw);
          const normalized = normalizeQuestionsPayload(reextracted);
          if (normalized) return { ok: true as const, data: normalized };
        } catch {
          // Fall through to raw
        }
        return { ok: true as const, data: { _raw: true as const, text: result.raw } };
      }
      const parsed = generateQuestionsOutputSchema.safeParse(result.parsed);
      if (!parsed.success) {
        const normalized = normalizeQuestionsPayload(result.parsed);
        if (normalized) return { ok: true as const, data: normalized };
        log({
          event: "ai.validation.failure",
          function: "generateQuestions",
          description: "Questions response did not match schema",
          rawSnippet: result.raw.slice(0, 500),
        });
        return { ok: true as const, data: { _raw: true as const, text: result.raw } };
      }
      return { ok: true as const, data: parsed.data };
    });
  }

  async generateBrief(
    input: GenerateBriefInput
  ): Promise<Result<FrameBrief, AIFailure>> {
    return this.callWithRetry<FrameBrief>("generateBrief", async () => {
      let result: { parsed: unknown | null; raw: string };
      try {
        result = await this.fetchJson({
          functionName: "generateBrief",
          system: BRIEF_SYSTEM_PROMPT,
          user: buildBriefPrompt(input),
          temperature: 0.4,
          maxTokens: 1000,
        });
      } catch (e) {
        return this.toFailure(e);
      }
      // Brief is intentionally freeform — always return stripped plain text.
      return { ok: true as const, data: { _raw: true as const, text: stripFences(result.raw) } };
    });
  }

  async generateOverlay(
    input: GenerateOverlayInput
  ): Promise<Result<MirrorOverlay, AIFailure>> {
    return this.callWithRetry<MirrorOverlay>("generateOverlay", async () => {
      let result: { parsed: unknown | null; raw: string };
      try {
        result = await this.fetchJson({
          functionName: "generateOverlay",
          system: OVERLAY_SYSTEM_PROMPT,
          user: buildOverlayPrompt(input),
          temperature: 0.3,
          maxTokens: 1200,
        });
      } catch (e) {
        return this.toFailure(e);
      }
      // Overlay is intentionally freeform — always return stripped plain text.
      return { ok: true as const, data: { _raw: true as const, text: stripFences(result.raw) } };
    });
  }

  private toFailure(e: unknown): { ok: false; error: AIFailure } {
    if (e instanceof TimeoutError) {
      return { ok: false, error: { code: "timeout", message: "Request timed out" } };
    }
    if (e instanceof RateLimitError) {
      return { ok: false, error: { code: "provider", message: "Rate limited" } };
    }
    if (e instanceof ProviderError) {
      let message = "AI service error";
      try {
        const parsed = JSON.parse(e.body) as { error?: { message?: string } };
        if (parsed?.error?.message && (e.status === 403 || e.status === 429)) {
          message = parsed.error.message;
        }
      } catch {
        if (e.body && e.body.length < 200) message = e.body;
      }
      return { ok: false, error: { code: "provider", message } };
    }
    if (e instanceof ValidationError) {
      return { ok: false, error: { code: "validation", message: e.message } };
    }
    return { ok: false, error: { code: "provider", message: "Unknown error" } };
  }

  private async callWithRetry<T>(
    _functionName: string,
    fn: () => Promise<Result<T, AIFailure>>
  ): Promise<Result<T, AIFailure>> {
    let lastResult: Result<T, AIFailure> | null = null;
    for (let attempt = 0; attempt <= 2; attempt++) {
      const result = await fn();
      if (result.ok) return result;
      lastResult = result;
      if (attempt < 2) {
        const delay = jitter(RETRY_DELAYS_MS[attempt] ?? 3_000);
        await sleep(delay);
      }
    }
    return lastResult ?? { ok: false, error: { code: "provider", message: "Unknown error" } };
  }

  /**
   * Returns the model list for this request. If OPENROUTER_MODEL_1 is set, uses
   * OPENROUTER_MODEL_1, OPENROUTER_MODEL_2, OPENROUTER_MODEL_3 (in order, up to 3),
   * filtered through the health tracker so persistently-failing overrides are skipped.
   * If the health filter would leave zero models, falls back to the raw override list so
   * we always try the user's configured models rather than returning 503.
   */
  private async getModelsForRequest(): Promise<string[]> {
    const o1 = process.env.OPENROUTER_MODEL_1;
    if (o1?.trim()) {
      const raw = [
        process.env.OPENROUTER_MODEL_1,
        process.env.OPENROUTER_MODEL_2,
        process.env.OPENROUTER_MODEL_3,
      ]
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .map((v) => v.trim())
        .slice(0, MODEL_COUNT);
      const healthy = raw.filter((v) => modelHealthTracker.isHealthy(v));
      return healthy.length > 0 ? healthy : raw;
    }
    return modelSelector.getAvailableModels(MODEL_COUNT);
  }

  private async fetchJson(options: {
    functionName: string;
    system: string;
    user: string;
    temperature: number;
    maxTokens: number;
  }): Promise<{ parsed: unknown | null; raw: string }> {
    const modelList = await this.getModelsForRequest();
    if (modelList.length === 0) {
      throw new ProviderError(503, "No healthy models available");
    }

    const usingOverrides = !!process.env.OPENROUTER_MODEL_1?.trim();
    let lastError: ProviderError | RateLimitError | TimeoutError | null = null;

    // When using overrides, try each model in order (first, then second, then third on failure).
    const toTry = usingOverrides ? modelList.map((m) => [m]) : [modelList];

    for (const models of toTry) {
      try {
        return await this.fetchJsonWithModels(options, models);
      } catch (e) {
        lastError = e instanceof ProviderError || e instanceof RateLimitError || e instanceof TimeoutError ? e : new ProviderError(0, String(e));
        if (toTry.length > 1) continue;
        throw e;
      }
    }
    throw lastError ?? new ProviderError(503, "All models failed");
  }

  private async fetchJsonWithModels(
    options: {
      functionName: string;
      system: string;
      user: string;
      temperature: number;
      maxTokens: number;
    },
    models: string[],
  ): Promise<{ parsed: unknown | null; raw: string }> {
    const messages: Array<{ role: "user"; content: string }> = [
      { role: "user", content: options.system },
      { role: "user", content: options.user },
    ];

    const cKey = cacheKey(models, messages, options.temperature, options.maxTokens);
    const cached = this.cache.get(cKey);
    if (cached !== undefined) return cached;

    const slot = this.keyPool.next();
    if (!slot) throw new RateLimitError();

    await slot.limiter.acquire();

    const timeoutMs = TIMEOUT_PER_MODEL_MS * models.length;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();

    let res: Response;
    try {
      res = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${slot.key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": this.siteUrl,
          "X-Title": this.siteName,
        },
        body: JSON.stringify({
          models,
          messages,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      models.forEach((m) => modelHealthTracker.recordFailure(m));
      if (err instanceof Error && err.name === "AbortError") {
        throw new TimeoutError();
      }
      throw err;
    }
    clearTimeout(timeout);

    if (res.status === 429) {
      // Back off the key only — 429 is a per-key quota event, not a model health signal.
      slot.markRateLimited();
      throw new RateLimitError();
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 404) {
        // 404 means no endpoint exists for this model under the current data policy — permanent.
        models.forEach((m) => modelHealthTracker.markIncompatible(m));
      } else {
        models.forEach((m) => modelHealthTracker.recordFailure(m));
      }
      throw new ProviderError(res.status, body);
    }

    const json = (await res.json()) as ChatCompletionResponse;
    const latencyMs = Date.now() - start;
    const respondingModel = json.model ?? models[0];

    const content: string = json.choices?.[0]?.message?.content ?? "";
    if (content.trim() === "") {
      models.forEach((m) => modelHealthTracker.recordFailure(m));
      const errMsg = json.error?.message ?? "Empty response from model";
      throw new ProviderError(res.status, errMsg);
    }

    let parsed: unknown | null;
    try {
      parsed = extractJson(content);
    } catch (e) {
      if (e instanceof ValidationError) {
        log({
          event: "ai.validation.failure",
          function: options.functionName,
          description: e.message,
          rawSnippet: content.slice(0, 500),
        });
      }
      parsed = null;
    }

    modelHealthTracker.recordSuccess(respondingModel, latencyMs);

    const out: { parsed: unknown | null; raw: string } = { parsed, raw: content };
    this.cache.set(cKey, out);
    return out;
  }
}

class TimeoutError extends Error {
  constructor() {
    super("Request timed out");
    this.name = "TimeoutError";
  }
}

class RateLimitError extends Error {
  constructor() {
    super("Rate limited by OpenRouter");
    this.name = "RateLimitError";
  }
}

class ProviderError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string
  ) {
    super(`OpenRouter error ${status}`);
    this.name = "ProviderError";
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
