import type { ModelDiscoveryService } from "./model-discovery";
import type { ModelScorer } from "./model-scorer";
import type { ModelHealthTracker } from "./model-health";
import { modelDiscovery } from "./model-discovery";
import { modelScorer } from "./model-scorer";
import { modelHealthTracker } from "./model-health";

const REFRESH_INTERVAL_MS = 2 * 60 * 1000;
const MAX_MODELS = 8;
const DEFAULT_COUNT = 3;

export class ModelSelector {
  private rankedIds: string[] = [];
  private lastRefresh = 0;
  private refreshPromise: Promise<void> | null = null;

  constructor(
    private discovery: ModelDiscoveryService,
    private scorer: ModelScorer,
    private health: ModelHealthTracker,
  ) {}

  /**
   * Returns up to `count` healthy model ids sorted by score (best first).
   * OpenRouter's `models` array accepts max 3 per request.
   */
  async getAvailableModels(count: number = DEFAULT_COUNT): Promise<string[]> {
    if (this.needsRefresh()) await this.refreshRanking();

    const capped = Math.min(count, MAX_MODELS);
    return this.rankedIds
      .filter((id) => this.health.isHealthy(id))
      .slice(0, capped);
  }

  private needsRefresh(): boolean {
    return (
      this.rankedIds.length === 0 ||
      Date.now() - this.lastRefresh > REFRESH_INTERVAL_MS
    );
  }

  private async refreshRanking(): Promise<void> {
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = (async () => {
      const models = await this.discovery.getModels();
      const scored = this.scorer.rank(models);
      this.rankedIds = scored.map((s) => s.model.id);
      this.lastRefresh = Date.now();
    })();

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }
}

export const modelSelector = new ModelSelector(
  modelDiscovery,
  modelScorer,
  modelHealthTracker,
);
