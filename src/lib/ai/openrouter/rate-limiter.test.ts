import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenRouterRateLimiter } from "./rate-limiter";

describe("OpenRouterRateLimiter", () => {
  let limiter: OpenRouterRateLimiter;

  beforeEach(() => {
    limiter = new OpenRouterRateLimiter();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request immediately", async () => {
    const promise = limiter.acquire();
    await vi.advanceTimersByTimeAsync(0);
    await promise;
  });

  it("enforces minimum interval between requests", async () => {
    // First request
    const p1 = limiter.acquire();
    await vi.advanceTimersByTimeAsync(0);
    await p1;

    const start = Date.now();
    const p2 = limiter.acquire();
    // Advance past the 500ms minimum interval
    await vi.advanceTimersByTimeAsync(600);
    await p2;
    expect(Date.now() - start).toBeGreaterThanOrEqual(500);
  });
});
