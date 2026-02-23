import type { OpenRouterModel, OpenRouterModelsResponse } from "./types";

const MODELS_URL = "https://openrouter.ai/api/v1/models";
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Infers parameter count in billions from the model id.
 * Looks for patterns like "7b", "3b", "13b" in the id string.
 * Returns null when the size can't be determined.
 */
export function inferParamBillions(modelId: string): number | null {
  const match = modelId.match(/(\d+(?:\.\d+)?)b/i);
  return match ? parseFloat(match[1]) : null;
}

function isFreeModel(model: OpenRouterModel): boolean {
  return (
    model.id.endsWith(":free") ||
    (model.pricing.prompt === "0" && model.pricing.completion === "0")
  );
}

export class ModelDiscoveryService {
  private cachedModels: OpenRouterModel[] = [];
  private lastFetchedAt = 0;
  private fetchPromise: Promise<void> | null = null;

  async getModels(): Promise<OpenRouterModel[]> {
    if (this.isCacheValid()) return this.cachedModels;
    await this.refresh();
    return this.cachedModels;
  }

  async refresh(): Promise<void> {
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = this.fetchModels()
      .then((models) => {
        this.cachedModels = models;
        this.lastFetchedAt = Date.now();
      })
      .catch(() => {
        // On failure, keep stale cache rather than clearing it
      })
      .finally(() => {
        this.fetchPromise = null;
      });

    return this.fetchPromise;
  }

  private isCacheValid(): boolean {
    return (
      this.cachedModels.length > 0 &&
      Date.now() - this.lastFetchedAt < CACHE_TTL_MS
    );
  }

  private async fetchModels(): Promise<OpenRouterModel[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(MODELS_URL, { signal: controller.signal });
      if (!res.ok) throw new Error(`Models API returned ${res.status}`);
      const body = (await res.json()) as OpenRouterModelsResponse;
      return body.data.filter((m) => isFreeModel(m));
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const modelDiscovery = new ModelDiscoveryService();

// Kick off background refresh on module load — non-blocking
void modelDiscovery.refresh();
