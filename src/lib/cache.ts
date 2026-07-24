// src/lib/cache.ts
// In-memory cache with TTL — for caching frequently accessed data

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL = 60 * 1000; // 1 minute

/**
 * Get a cached value or compute and cache it
 */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL,
): Promise<T> {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data as T;
  }

  const data = await fn();
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data;
}

/**
 * Get a cached value (returns null if not cached or expired)
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    if (entry) cache.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * Set a cached value
 */
export function setCached<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/**
 * Invalidate a cached value
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all cache entries matching a prefix
 */
export function invalidateCachePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  cache.clear();
}

// Cleanup expired entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt <= now) {
        cache.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

// ─── Predefined cache keys ──────────────────────────────────────
export const CACHE_KEYS = {
  DASHBOARD_STATS: 'admin:dashboard:stats',
  SYSTEM_INFO: 'admin:system:info',
  USER_LIST: (page: number, search?: string) => `admin:users:${page}:${search ?? ''}`,
  PLANS: 'billing:plans',
  SETTINGS: 'admin:settings',
  LANGUAGES: 'admin:languages',
  PAGES: 'admin:pages',
} as const;
