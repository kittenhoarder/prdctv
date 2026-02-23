import { describe, it, expect, vi, afterEach } from "vitest";
import { ResponseCache, cacheKey } from "./response-cache";

describe("ResponseCache", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores and retrieves values", () => {
    const cache = new ResponseCache<string>();
    cache.set("k1", "value1");
    expect(cache.get("k1")).toBe("value1");
  });

  it("returns undefined for missing keys", () => {
    const cache = new ResponseCache<string>();
    expect(cache.get("missing")).toBeUndefined();
  });

  it("evicts expired entries", () => {
    const cache = new ResponseCache<string>(100); // 100ms TTL
    const now = Date.now();

    vi.spyOn(Date, "now").mockReturnValue(now);
    cache.set("k1", "value1");

    vi.spyOn(Date, "now").mockReturnValue(now + 200);
    expect(cache.get("k1")).toBeUndefined();
  });

  it("has() returns false for expired entries", () => {
    const cache = new ResponseCache<string>(100);
    const now = Date.now();

    vi.spyOn(Date, "now").mockReturnValue(now);
    cache.set("k1", "value1");

    vi.spyOn(Date, "now").mockReturnValue(now + 200);
    expect(cache.has("k1")).toBe(false);
  });

  it("enforces max entries with LRU eviction", () => {
    const cache = new ResponseCache<string>(60_000, 3);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");
    cache.set("d", "4"); // should evict "a"

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("d")).toBe("4");
    expect(cache.size).toBe(3);
  });

  it("moves accessed entries to most-recent position", () => {
    const cache = new ResponseCache<string>(60_000, 3);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");

    // Access "a" to make it most-recently-used
    cache.get("a");

    cache.set("d", "4"); // should evict "b" (now oldest)

    expect(cache.get("a")).toBe("1");
    expect(cache.get("b")).toBeUndefined();
  });

  it("clear() empties the cache", () => {
    const cache = new ResponseCache<string>();
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

describe("cacheKey", () => {
  it("produces deterministic keys", () => {
    const msgs = [{ role: "user" as const, content: "hello" }];
    const k1 = cacheKey(["model-a"], msgs, 0.7, 500);
    const k2 = cacheKey(["model-a"], msgs, 0.7, 500);
    expect(k1).toBe(k2);
  });

  it("produces different keys for different inputs", () => {
    const msgs = [{ role: "user" as const, content: "hello" }];
    const k1 = cacheKey(["model-a"], msgs, 0.7, 500);
    const k2 = cacheKey(["model-b"], msgs, 0.7, 500);
    expect(k1).not.toBe(k2);
  });

  it("prefixes keys with or_", () => {
    const key = cacheKey(["m"], [{ role: "user", content: "x" }], 0, 0);
    expect(key.startsWith("or_")).toBe(true);
  });
});
