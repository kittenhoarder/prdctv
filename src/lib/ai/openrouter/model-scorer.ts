import type { OpenRouterModel, ScoredModel } from "./types";
import { inferParamBillions } from "./model-discovery";

const WEIGHT_CONTEXT = 0.40;
const WEIGHT_INSTRUCT = 0.30;
const WEIGHT_QUALITY = 0.20;
const WEIGHT_SPEED = 0.05;
const WEIGHT_AVAILABILITY = 0.05;

const PREFERRED_MIN_B = 3;
const PREFERRED_MAX_B = 7;

function contextScore(contextLength: number): number {
  // Normalise: 4k = 0, 32k = 0.8, 128k+ = 1.0
  const clamped = Math.min(contextLength, 131_072);
  return Math.min(1, clamped / 131_072);
}

function instructScore(model: OpenRouterModel): number {
  return model.architecture?.instruct_type ? 1 : 0;
}

function qualityScore(model: OpenRouterModel): number {
  // Provider-agnostic: quality is inferred from model size only.
  const base = 0.70;
  const params = inferParamBillions(model.id);
  if (params === null) return base;

  // 3–7B sweet spot: capable enough for instruction following without sacrificing too much speed.
  // Sub-3B models are noticeably weaker at following complex prompts.
  if (params >= PREFERRED_MIN_B && params <= PREFERRED_MAX_B) return base + 0.15;
  if (params < PREFERRED_MIN_B) return Math.max(0, base - 0.25);
  return base; // 7B+ — acceptable
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
