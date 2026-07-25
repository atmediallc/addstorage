// src/app/api/zip/[...path]/route.ts
// Zip download endpoint — streams zip file to client

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getS3Key } from '@/lib/s3';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/api-security';
import archiver from 'archiver';
import { PassThrough } from 'stream';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large zips

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const ip = getClientIp(request);
  const rl = checkRateLimit(`zip:${ip}`, RATE_LIMITS.upload);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  const { path } = await params;

  // path format: [userId, ...fileIds]
  if (!path || path.length < 2) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const userIdStr = path[0];
  if (!userIdStr) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  const userId = parseInt(userIdStr, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

  // Get files to zip
  const fileIds = path.slice(1).map(Number).filter((id) => !isNaN(id));
  if (fileIds.length === 0) {
    return NextResponse.json({ error: 'No files specified' }, { status: 400 });
  }

  const files = await db.fileManagerFile.findMany({
    where: {
      uniqueId: { in: fileIds },
      userId,
      deletedAt: null,
    },
  });

  if (files.length === 0) {
    return NextResponse.json({ error: 'No valid files found' }, { status: 404 });
  }

  // Create zip archive piped to a PassThrough stream
  const passthrough = new PassThrough();
  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.pipe(passthrough);

  // Add files from S3
  for (const file of files) {
    try {
      const key = getS3Key(userId, file.uniqueId, file.basename ?? file.name ?? 'unknown');
      const { getPresignedDownloadUrl } = await import('@/lib/s3');
      const presignedUrl = await getPresignedDownloadUrl(key, 3600);

      const response = await fetch(presignedUrl);
      if (response.ok) {
        const fileName = file.name ?? file.basename ?? `file-${file.uniqueId}`;
        const buffer = Buffer.from(await response.arrayBuffer());
        archive.append(buffer, { name: fileName });
      }
    } catch {
      // Skip files that can't be fetched
    }
  }

  // Finalize the archive (this closes the PassThrough)
  archive.finalize();

  // Convert PassThrough to a Buffer for Next.js Response
  const chunks: Buffer[] = [];
  for await (const chunk of passthrough) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const zipBuffer = Buffer.concat(chunks);

  return new Response(zipBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="tutiscloud-${Date.now()}.zip"`,
      'Content-Length': String(zipBuffer.length),
    },
  });
}
