// src/app/api/images/[...path]/route.ts
// System image serving — resolves S3 system image keys, serves presigned redirects

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getPresignedDownloadUrl } from '@/lib/s3';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/api-security';

const DEFAULT_IMAGE_URL =
  process.env.DEFAULT_IMAGE_URL ?? '/images/default.png';

function sanitizeSegment(seg: string): string | null {
  if (
    seg.includes('..') ||
    seg.includes('\0') ||
    seg.includes('/') ||
    seg.includes('\\')
  ) {
    return null;
  }
  if (!/^[a-zA-Z0-9._\-]+$/.test(seg)) {
    return null;
  }
  return seg;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  // ── Rate limit ──────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = checkRateLimit(`image:${ip}`, RATE_LIMITS.api);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(
            Math.ceil((rl.resetAt - Date.now()) / 1000),
          ),
        },
      },
    );
  }

  const { path } = await params;

  if (!path || path.length === 0) {
    return NextResponse.redirect(new URL(DEFAULT_IMAGE_URL, request.url));
  }

  // ── Sanitize path segments ──────────────────────────────────
  const segments: string[] = [];
  for (const seg of path) {
    const safe = sanitizeSegment(seg);
    if (!safe) {
      return NextResponse.redirect(new URL(DEFAULT_IMAGE_URL, request.url));
    }
    segments.push(safe);
  }

  const filename = segments[segments.length - 1];
  const s3Key = `images/${segments.join('/')}`;

  try {
    const presignedUrl = await getPresignedDownloadUrl(s3Key, 3600);
    return NextResponse.redirect(presignedUrl);
  } catch {
    return NextResponse.redirect(new URL(DEFAULT_IMAGE_URL, request.url));
  }
}
