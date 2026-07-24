// src/app/api/cron/route.ts
// Vercel Cron Jobs endpoint — handles scheduled tasks
// Add to vercel.json: { "crons": [{ "path": "/api/cron", "schedule": "0 2 * * *" }] }

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  try {
    // ── 1. Clean expired shares ─────────────────────────────────
    const expiredShares = await db.share.deleteMany({
      where: {
        expireIn: { not: null },
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // older than 24h
        },
      },
    });
    results.push(`Deleted ${expiredShares.count} expired shares`);

    // ── 2. Clean expired zips ───────────────────────────────────
    const expiredZips = await db.zip.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });
    results.push(`Deleted ${expiredZips.count} expired zips`);

    // ── 3. Clean soft-deleted items older than retention period ──
    const retentionDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days

    const deletedFiles = await db.fileManagerFile.deleteMany({
      where: {
        deletedAt: { not: null, lt: retentionDate },
      },
    });
    results.push(`Permanently deleted ${deletedFiles.count} trashed files`);

    const deletedFolders = await db.fileManagerFolder.deleteMany({
      where: {
        deletedAt: { not: null, lt: retentionDate },
      },
    });
    results.push(`Permanently deleted ${deletedFolders.count} trashed folders`);

    // ── 4. Clean expired password resets ────────────────────────
    const expiredResets = await db.passwordReset.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 60 * 60 * 1000), // older than 1 hour
        },
      },
    });
    results.push(`Deleted ${expiredResets.count} expired password resets`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tasks: results,
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tasks: results,
      },
      { status: 500 },
    );
  }
}

// Allow POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
