// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/server/db';

export async function GET() {
  const checks: Record<string, string> = {};

  // Database check
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  // Version
  checks.version = process.env.APP_VERSION ?? '0.1.0';

  const allOk = Object.values(checks).every((v) => v === 'ok' || v === process.env.APP_VERSION);

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'degraded',
      version: checks.version,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 },
  );
}
