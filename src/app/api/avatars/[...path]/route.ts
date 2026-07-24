// src/app/api/avatars/[...path]/route.ts
// Avatar serving API — resolves S3 avatar keys, serves presigned redirects

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { auth } from '@/server/auth';
import { getPresignedDownloadUrl } from '@/lib/s3';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/api-security';

const DEFAULT_AVATAR_URL =
  process.env.DEFAULT_AVATAR_URL ?? '/avatars/default.png';

function sanitizeSegment(seg: string): string | null {
  // reject path traversal, null bytes, anything non-filename
  if (
    seg.includes('..') ||
    seg.includes('\0') ||
    seg.includes('/') ||
    seg.includes('\\')
  ) {
    return null;
  }
  // only allow alphanumeric, hyphens, underscores, dots
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
  const rl = checkRateLimit(`avatar:${ip}`, RATE_LIMITS.api);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    );
  }

  const { path } = await params;

  if (!path || path.length === 0) {
    return NextResponse.json({ error: 'Path required' }, { status: 400 });
  }

  // ── Validate & sanitize all segments ────────────────────────
  const segments: string[] = [];
  for (const seg of path) {
    const clean = sanitizeSegment(seg);
    if (clean === null) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    segments.push(clean);
  }

  // ── Parse path formats ──────────────────────────────────────
  // Two supported formats:
  //   /api/avatars/{userId}/{filename}   — user-specific avatar
  //   /api/avatars/{filename}            — flat lookup (default avatar)
  let userId: number | null = null;
  let filename: string;

  if (segments.length >= 2) {
    // {userId}/{filename}
    const parsedId = Number(segments[0]);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }
    userId = parsedId;
    // filename may include subdirectories like {userId}/uploads/avatar.webp
    filename = segments.slice(1).join('/');
  } else {
    // Single segment — treat as filename; attempt to find owner via DB
    filename = segments[0];
  }

  // ── Resolve user ────────────────────────────────────────────
  if (userId === null) {
    // Try to find a user whose avatar matches this filename
    const user = await db.user.findFirst({
      where: { avatar: filename, deletedAt: null },
      select: { id: true },
    });
    if (user) {
      userId = user.id;
    }
    // If no user found, treat as a public / static avatar (default avatar fallthrough)
  }

  // ── Auth session (optional — enriches response but not required for redirects) ──
  const session = await auth.api.getSession({ headers: request.headers });

  // ── Avatar not found ────────────────────────────────────────
  if (userId === null) {
    // No owner found — serve default avatar
    return NextResponse.redirect(DEFAULT_AVATAR_URL, 302);
  }

  // Verify the user exists and is not deleted
  const user = await db.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, avatar: true },
  });

  if (!user) {
    return NextResponse.redirect(DEFAULT_AVATAR_URL, 302);
  }

  // If user has no avatar set, serve default
  if (!user.avatar) {
    return NextResponse.redirect(DEFAULT_AVATAR_URL, 302);
  }

  // Build S3 key: avatars/{userId}/{filename}
  const s3Key = `avatars/${userId}/${filename}`;

  try {
    const presignedUrl = await getPresignedDownloadUrl(s3Key, 3600);
    return NextResponse.redirect(presignedUrl, 302);
  } catch {
    // S3 key doesn't exist or access denied — fall back to default
    return NextResponse.redirect(DEFAULT_AVATAR_URL, 302);
  }
}
