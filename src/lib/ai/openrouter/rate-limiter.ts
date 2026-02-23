const MAX_REQUESTS = 18; // 90% of OpenRouter's 20/min cap
const WINDOW_MS = 60_000;
const MIN_INTERVAL_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Token-bucket rate limiter scoped to outbound OpenRouter requests.
 * Complements the Upstash per-IP rate limiting at the API route layer.
 */
export class OpenRouterRateLimiter {
  private timestamps: number[] = [];
  private lastRequest = 0;
  private pending: Promise<void> | null = null;

  /**
   * Blocks until a request slot is available.
   * Enforces both the per-window cap and the minimum inter-request interval.
   */
  async acquire(): Promise<void> {
    // Serialise concurrent callers so we don't double-spend tokens
    while (this.pending) {
      await this.pending;
    }

    this.pending = this.waitForSlot();
    try {
      await this.pending;
    } finally {
      this.pending = null;
    }
  }

  private async waitForSlot(): Promise<void> {
    // Enforce minimum interval between requests
    const sinceLast = Date.now() - this.lastRequest;
    if (sinceLast < MIN_INTERVAL_MS) {
      await sleep(MIN_INTERVAL_MS - sinceLast);
    }

    // Purge timestamps outside the window
    const cutoff = Date.now() - WINDOW_MS;
    this.timestamps = this.timestamps.filter((t) => t > cutoff);

    // Wait for a slot if we're at capacity
    while (this.timestamps.length >= MAX_REQUESTS) {
      const oldest = this.timestamps[0];
      const waitMs = oldest + WINDOW_MS - Date.now() + 1;
      if (waitMs > 0) await sleep(waitMs);
      const newCutoff = Date.now() - WINDOW_MS;
      this.timestamps = this.timestamps.filter((t) => t > newCutoff);
    }

    const now = Date.now();
    this.timestamps.push(now);
    this.lastRequest = now;
  }
}

export const openRouterRateLimiter = new OpenRouterRateLimiter();
