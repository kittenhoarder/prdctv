import type { ModelHealthRecord } from "./types";

const WINDOW_SIZE = 20;
const UNHEALTHY_THRESHOLD = 0.50;
const RATE_LIMIT_COOLDOWN_MS = 10 * 60 * 1000;
const GRACE_PERIOD_REQUESTS = 3;

export class ModelHealthTracker {
  private records = new Map<string, ModelHealthRecord>();

  recordSuccess(modelId: string, latencyMs: number): void {
    const record = this.getOrCreate(modelId);
    record.outcomes.push({ success: true, timestamp: Date.now(), latencyMs });
    this.trimOutcomes(record);
  }

  recordFailure(modelId: string): void {
    const record = this.getOrCreate(modelId);
    record.outcomes.push({ success: false, timestamp: Date.now() });
    this.trimOutcomes(record);
  }

  recordRateLimit(modelId: string): void {
    const record = this.getOrCreate(modelId);
    record.rateLimitedUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
    record.outcomes.push({ success: false, timestamp: Date.now() });
    this.trimOutcomes(record);
  }

  markIncompatible(modelId: string): void {
    const record = this.getOrCreate(modelId);
    record.incompatible = true;
  }

  isHealthy(modelId: string): boolean {
    const record = this.records.get(modelId);
    if (!record) return true; // unseen model — give it a chance

    if (record.incompatible) return false;

    if (
      record.rateLimitedUntil !== null &&
      Date.now() < record.rateLimitedUntil
    ) {
      return false;
    }

    // Grace period: new models are healthy until they have enough data
    if (record.outcomes.length < GRACE_PERIOD_REQUESTS) return true;

    const successCount = record.outcomes.filter((o) => o.success).length;
    return successCount / record.outcomes.length >= UNHEALTHY_THRESHOLD;
  }

  getAverageLatency(modelId: string): number | null {
    const record = this.records.get(modelId);
    if (!record) return null;
    const latencies = record.outcomes
      .filter((o) => o.success && o.latencyMs !== undefined)
      .map((o) => o.latencyMs!);
    if (latencies.length === 0) return null;
    return latencies.reduce((a, b) => a + b, 0) / latencies.length;
  }

  private getOrCreate(modelId: string): ModelHealthRecord {
    let record = this.records.get(modelId);
    if (!record) {
      record = { outcomes: [], rateLimitedUntil: null, incompatible: false };
      this.records.set(modelId, record);
    }
    return record;
  }

  private trimOutcomes(record: ModelHealthRecord): void {
    if (record.outcomes.length > WINDOW_SIZE) {
      record.outcomes = record.outcomes.slice(-WINDOW_SIZE);
    }
  }
}

export const modelHealthTracker = new ModelHealthTracker();
