const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 100;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Simple in-memory LRU cache with TTL eviction.
 * Keys should be deterministic hashes of the request parameters.
 */
export class ResponseCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private ttlMs: number;
  private maxEntries: number;

  constructor(ttlMs = DEFAULT_TTL_MS, maxEntries = DEFAULT_MAX_ENTRIES) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    // Move to end (most recently used) by re-inserting
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    // Delete first to ensure LRU ordering on re-insert
    this.store.delete(key);

    // Evict oldest entries if at capacity
    while (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }

    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  get size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Generates a cache key from request parameters.
 * Uses a simple string hash to avoid crypto dependency.
 */
export function cacheKey(
  models: string[],
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  maxTokens: number,
): string {
  const raw = JSON.stringify({ models, messages, temperature, maxTokens });
  // djb2 hash — fast, deterministic, collision-unlikely for our use case
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) | 0;
  }
  return `or_${hash >>> 0}`;
}
