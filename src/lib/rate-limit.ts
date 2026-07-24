// src/lib/rate-limit.ts
// In-memory rate limiter for API routes

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 5 * 60 * 1000);

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { windowMs: 60_000, maxRequests: 60 },
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  entry.count++;

  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Preset configs
export const RATE_LIMITS = {
  auth: { windowMs: 15 * 60_000, maxRequests: 10 },    // 10 per 15 min
  api: { windowMs: 60_000, maxRequests: 100 },          // 100 per minute
  upload: { windowMs: 60_000, maxRequests: 20 },        // 20 per minute
  share: { windowMs: 60_000, maxRequests: 30 },         // 30 per minute
  search: { windowMs: 60_000, maxRequests: 60 },        // 60 per minute
} as const;
