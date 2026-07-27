// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/server/db';

export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number }> = {};

  // Database
  const dbStart = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (e) {
    checks.database = { status: 'error', latencyMs: Date.now() - dbStart };
  }

  // Disk space
  const mem = process.memoryUsage();
  checks.memory = {
    status: 'ok',
    latencyMs: Math.round(mem.heapUsed / 1024 / 1024),
  };

  const allHealthy = Object.values(checks).every((c) => c.status === 'ok');

  return NextResponse.json(
    {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: process.env.APP_VERSION ?? 'unknown',
      checks,
    },
    { status: allHealthy ? 200 : 503 },
  );
}
