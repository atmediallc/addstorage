// src/lib/api-security.ts
// API route security helpers

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMITS } from './rate-limit';
import { type ZodSchema } from 'zod';

/**
 * Get client IP from request
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

/**
 * Apply rate limiting to a request
 */
export function rateLimit(
  request: NextRequest,
  key: string,
  config = RATE_LIMITS.api,
): NextResponse | null {
  const ip = getClientIp(request);
  const result = checkRateLimit(`${key}:${ip}`, config);

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  return null; // allowed
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  request: NextRequest,
  key: string,
  config = RATE_LIMITS.api,
): NextResponse {
  const ip = getClientIp(request);
  const result = checkRateLimit(`${key}:${ip}`, config);

  response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(Math.max(0, result.remaining)));

  return response;
}

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>,
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        error: NextResponse.json(
          {
            error: 'Validation failed',
            details: result.error.flatten().fieldErrors,
          },
          { status: 400 },
        ),
      };
    }

    return { data: result.data };
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      ),
    };
  }
}

/**
 * Generate a CSRF token (simple double-submit cookie pattern)
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check for common attack patterns in a string
 */
export function hasSuspiciousPattern(input: string): boolean {
  const patterns = [
    /\.\.\//,           // path traversal
    /\0/,               // null bytes
    /<script/i,         // XSS
    /javascript:/i,     // protocol injection
    /on\w+\s*=/i,       // event handlers
    /union\s+select/i,  // SQL injection
    /;\s*drop\s/i,      // SQL drop
    /exec\s*\(/i,       // code execution
  ];
  return patterns.some((p) => p.test(input));
}
