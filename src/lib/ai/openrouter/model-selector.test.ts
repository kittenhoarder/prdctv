import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModelSelector } from "./model-selector";
import { ModelDiscoveryService } from "./model-discovery";
import { ModelScorer } from "./model-scorer";
import { ModelHealthTracker } from "./model-health";
import type { OpenRouterModel } from "./types";

function makeModel(id: string, contextLength = 8192): OpenRouterModel {
  return {
    id,
    name: id,
    context_length: contextLength,
    pricing: { prompt: "0", completion: "0" },
    architecture: { modality: "text->text", instruct_type: "llama" },
  };
}

describe("ModelSelector", () => {
  let discovery: ModelDiscoveryService;
  let scorer: ModelScorer;
  let health: ModelHealthTracker;
  let selector: ModelSelector;

  beforeEach(() => {
    discovery = new ModelDiscoveryService();
    scorer = new ModelScorer();
    health = new ModelHealthTracker();
    selector = new ModelSelector(discovery, scorer, health);
  });

  it("returns up to 3 healthy models by default", async () => {
    const models = [
      makeModel("a/model-3b:free"),
      makeModel("b/model-5b:free"),
      makeModel("c/model-7b:free"),
      makeModel("d/model-1b:free"),
    ];
    vi.spyOn(discovery, "getModels").mockResolvedValue(models);

    const result = await selector.getAvailableModels();
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result.length).toBeGreaterThan(0);
  });

  it("excludes unhealthy models", async () => {
    const models = [
      makeModel("a/model-3b:free"),
      makeModel("b/model-5b:free"),
    ];
    vi.spyOn(discovery, "getModels").mockResolvedValue(models);

    health.markIncompatible("a/model-3b:free");

    const result = await selector.getAvailableModels();
    expect(result).not.toContain("a/model-3b:free");
  });

  it("caps at requested count", async () => {
    const models = Array.from({ length: 10 }, (_, i) =>
      makeModel(`org/model-${i + 1}b:free`)
    );
    vi.spyOn(discovery, "getModels").mockResolvedValue(models);

    const result = await selector.getAvailableModels(2);
    expect(result).toHaveLength(2);
  });

  it("caps at maximum of 8", async () => {
    const models = Array.from({ length: 15 }, (_, i) =>
      makeModel(`org/model-${i + 1}b:free`)
    );
    vi.spyOn(discovery, "getModels").mockResolvedValue(models);

    const result = await selector.getAvailableModels(20);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it("returns empty when no models available", async () => {
    vi.spyOn(discovery, "getModels").mockResolvedValue([]);

    const result = await selector.getAvailableModels();
    expect(result).toEqual([]);
  });
});
