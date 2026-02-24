import { OpenRouterRateLimiter } from "./rate-limiter";

const RATE_LIMIT_BACKOFF_MS = 60_000;

interface KeyEntry {
  key: string;
  limiter: OpenRouterRateLimiter;
  rateLimitedUntil: number | null;
}

export interface KeySlot {
  key: string;
  limiter: OpenRouterRateLimiter;
  markRateLimited: () => void;
}

/**
 * Round-robin key pool for distributing OpenRouter API calls across multiple keys.
 * Each key gets its own rate limiter instance (18 req/min) and is temporarily
 * skipped for 60 s after receiving a 429 response.
 */
export class KeyPool {
  private readonly entries: KeyEntry[];
  private index = 0;

  constructor(keys: string[]) {
    if (keys.length === 0) throw new Error("KeyPool requires at least one API key");
    this.entries = keys.map((key) => ({
      key,
      limiter: new OpenRouterRateLimiter(),
      rateLimitedUntil: null,
    }));
  }

  get size(): number {
    return this.entries.length;
  }

  /**
   * Returns the next available key slot using round-robin, skipping keys that
   * are within their 429 backoff window. Returns null if all keys are backed off.
   */
  next(): KeySlot | null {
    const now = Date.now();
    const start = this.index;

    for (let i = 0; i < this.entries.length; i++) {
      const idx = (start + i) % this.entries.length;
      const entry = this.entries[idx];

      if (entry.rateLimitedUntil !== null && entry.rateLimitedUntil > now) {
        continue;
      }

      // Advance the shared index so the next caller gets the following key
      this.index = (idx + 1) % this.entries.length;

      return {
        key: entry.key,
        limiter: entry.limiter,
        markRateLimited: () => {
          entry.rateLimitedUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
        },
      };
    }

    return null;
  }

  /** Number of keys currently in the 429 backoff window. */
  rateLimitedCount(): number {
    const now = Date.now();
    return this.entries.filter(
      (e) => e.rateLimitedUntil !== null && e.rateLimitedUntil > now
    ).length;
  }
}
