import { describe, it, expect } from "vitest";
import { ModelScorer } from "./model-scorer";
import type { OpenRouterModel } from "./types";

function makeModel(overrides: Partial<OpenRouterModel> = {}): OpenRouterModel {
  return {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    name: "Llama 3.2 3B Instruct",
    context_length: 8192,
    pricing: { prompt: "0", completion: "0" },
    architecture: { modality: "text->text", instruct_type: "llama" },
    ...overrides,
  };
}

describe("ModelScorer", () => {
  const scorer = new ModelScorer();

  it("returns a score between 0 and 1", () => {
    const score = scorer.score(makeModel());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("ranks models with longer context higher (all else equal)", () => {
    const short = makeModel({ context_length: 4096 });
    const long = makeModel({
      id: "meta-llama/llama-3.2-3b-long:free",
      context_length: 131_072,
    });

    expect(scorer.score(long)).toBeGreaterThan(scorer.score(short));
  });

  it("ranks instruct models higher than non-instruct", () => {
    const instruct = makeModel();
    const noInstruct = makeModel({
      id: "meta-llama/llama-3.2-3b-base:free",
      architecture: { modality: "text->text" },
    });

    expect(scorer.score(instruct)).toBeGreaterThan(scorer.score(noInstruct));
  });

  it("prefers 3B-7B range over smaller models", () => {
    const sweet = makeModel({ id: "meta-llama/llama-3.2-5b-instruct:free" });
    const tiny = makeModel({ id: "meta-llama/llama-3.2-1b-instruct:free" });

    expect(scorer.score(sweet)).toBeGreaterThan(scorer.score(tiny));
  });

  it("ranks known families higher than unknown", () => {
    const known = makeModel({ id: "meta-llama/llama-7b:free" });
    const unknown = makeModel({ id: "unknown-org/model-7b:free" });

    expect(scorer.score(known)).toBeGreaterThan(scorer.score(unknown));
  });

  it("rank() returns models sorted by score descending", () => {
    const models = [
      makeModel({ id: "unknown-org/tiny-1b:free", context_length: 2048 }),
      makeModel({ id: "meta-llama/llama-7b:free", context_length: 32768 }),
      makeModel({ id: "mistralai/mistral-3b:free", context_length: 8192 }),
    ];

    const ranked = scorer.rank(models);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
  });
});
