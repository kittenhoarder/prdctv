import type { OpenRouterModel, ScoredModel } from "./types";
import { inferParamBillions } from "./model-discovery";

const WEIGHT_CONTEXT = 0.35;
const WEIGHT_INSTRUCT = 0.15;
const WEIGHT_QUALITY = 0.20;
const WEIGHT_SPEED = 0.20;
const WEIGHT_AVAILABILITY = 0.10;

const PREFERRED_MIN_B = 3;
const PREFERRED_MAX_B = 7;

/**
 * Higher-quality model families receive a base quality boost.
 * Extend this map as new free-tier families appear on OpenRouter.
 */
const FAMILY_QUALITY: Record<string, number> = {
  "meta-llama": 0.85,
  "mistralai": 0.80,
  "google": 0.80,
  "qwen": 0.75,
  "microsoft": 0.70,
  "deepseek": 0.75,
};

function contextScore(contextLength: number): number {
  // Normalise: 4k = 0, 32k = 0.8, 128k+ = 1.0
  const clamped = Math.min(contextLength, 131_072);
  return Math.min(1, clamped / 131_072);
}

function instructScore(model: OpenRouterModel): number {
  return model.architecture?.instruct_type ? 1 : 0;
}

function qualityScore(model: OpenRouterModel): number {
  const family = model.id.split("/")[0];
  const base = FAMILY_QUALITY[family] ?? 0.50;
  const params = inferParamBillions(model.id);
  if (params === null) return base;

  // Sweet spot: 3B-7B gets a bonus. Sub-3B models produce noticeably lower-quality
  // structured JSON, so the penalty is larger than the speed advantage they gain.
  if (params >= PREFERRED_MIN_B && params <= PREFERRED_MAX_B) return base + 0.15;
  if (params < PREFERRED_MIN_B) return Math.max(0, base - 0.25);
  return base; // 7B-13B — acceptable but no bonus
}

function speedScore(model: OpenRouterModel): number {
  const params = inferParamBillions(model.id);
  if (params === null) return 0.50;
  // Smaller = faster. 1B → 1.0, 7B → 0.57, 13B → 0.23
  return Math.max(0, 1 - (params - 1) / 13);
}

function availabilityScore(model: OpenRouterModel): number {
  let score = 0.50;
  if (model.top_provider?.max_completion_tokens) score += 0.25;
  if (model.architecture?.modality === "text->text") score += 0.25;
  return Math.min(1, score);
}

export class ModelScorer {
  score(model: OpenRouterModel): number {
    return (
      contextScore(model.context_length) * WEIGHT_CONTEXT +
      instructScore(model) * WEIGHT_INSTRUCT +
      qualityScore(model) * WEIGHT_QUALITY +
      speedScore(model) * WEIGHT_SPEED +
      availabilityScore(model) * WEIGHT_AVAILABILITY
    );
  }

  rank(models: OpenRouterModel[]): ScoredModel[] {
    return models
      .map((model) => ({ model, score: this.score(model) }))
      .sort((a, b) => b.score - a.score);
  }
}

export const modelScorer = new ModelScorer();
