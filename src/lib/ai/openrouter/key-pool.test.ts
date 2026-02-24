import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { KeyPool } from "./key-pool";

describe("KeyPool", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws when constructed with an empty key list", () => {
    expect(() => new KeyPool([])).toThrow("at least one");
  });

  it("returns a slot for a single key", () => {
    const pool = new KeyPool(["key-a"]);
    const slot = pool.next();
    expect(slot).not.toBeNull();
    expect(slot?.key).toBe("key-a");
  });

  it("cycles round-robin across multiple keys", () => {
    const pool = new KeyPool(["k1", "k2", "k3"]);
    expect(pool.next()?.key).toBe("k1");
    expect(pool.next()?.key).toBe("k2");
    expect(pool.next()?.key).toBe("k3");
    expect(pool.next()?.key).toBe("k1");
  });

  it("skips a key that is rate-limited and returns the next available", () => {
    const pool = new KeyPool(["k1", "k2", "k3"]);

    const first = pool.next();
    expect(first?.key).toBe("k1");
    first?.markRateLimited();

    // k1 is backed off — next call should jump to k2
    expect(pool.next()?.key).toBe("k2");
  });

  it("returns null when all keys are rate-limited", () => {
    const pool = new KeyPool(["k1", "k2"]);

    pool.next()?.markRateLimited();
    pool.next()?.markRateLimited();

    expect(pool.next()).toBeNull();
  });

  it("resumes a key after its backoff window expires", () => {
    const pool = new KeyPool(["k1", "k2"]);

    pool.next()?.markRateLimited(); // k1 backed off
    pool.next()?.markRateLimited(); // k2 backed off

    expect(pool.next()).toBeNull();

    // Advance time past the 60 s backoff
    vi.advanceTimersByTime(61_000);

    const slot = pool.next();
    expect(slot).not.toBeNull();
    expect(["k1", "k2"]).toContain(slot?.key);
  });

  it("reports the correct rateLimitedCount", () => {
    const pool = new KeyPool(["k1", "k2", "k3"]);

    expect(pool.rateLimitedCount()).toBe(0);

    pool.next()?.markRateLimited();
    expect(pool.rateLimitedCount()).toBe(1);

    pool.next()?.markRateLimited();
    expect(pool.rateLimitedCount()).toBe(2);

    vi.advanceTimersByTime(61_000);
    expect(pool.rateLimitedCount()).toBe(0);
  });

  it("returns a limiter on each slot", () => {
    const pool = new KeyPool(["k1", "k2"]);
    const slot1 = pool.next();
    const slot2 = pool.next();
    expect(slot1?.limiter).toBeDefined();
    expect(slot2?.limiter).toBeDefined();
    // Each key gets its own limiter instance
    expect(slot1?.limiter).not.toBe(slot2?.limiter);
  });

  it("exposes the pool size", () => {
    const pool = new KeyPool(["a", "b", "c"]);
    expect(pool.size).toBe(3);
  });
});
