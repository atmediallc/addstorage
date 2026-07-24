// src/server/jobs/queue.ts
// BullMQ queue setup for background jobs

import { Queue, QueueEvents, Job } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection
const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// ─── Queue Definitions ─────────────────────────────────────────

export const emailQueue = new Queue('email', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

export const zipQueue = new Queue('zip', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 10,
    attempts: 2,
    timeout: 300000, // 5 minutes
  },
});

export const cleanupQueue = new Queue('cleanup', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 20,
    attempts: 2,
  },
});

// ─── Job Data Types ────────────────────────────────────────────

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface ZipJobData {
  userId: number;
  fileIds: number[];
  folderName?: string;
}

export interface CleanupJobData {
  type: 'trash' | 'shares' | 'zips' | 'all';
  olderThanDays?: number;
}

// ─── Job Processors (imported by worker) ───────────────────────

export async function processEmailJob(job: Job<EmailJobData>) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'TutisCloud <noreply@tutiscloud.com>';

  await resend.emails.send({
    from: job.data.from ?? FROM_ADDRESS,
    to: job.data.to,
    subject: job.data.subject,
    html: job.data.html,
  });

  return { success: true, to: job.data.to };
}

export async function processZipJob(job: Job<ZipJobData>) {
  const { db } = await import('@/server/db');
  const { getS3Key } = await import('@/lib/s3');

  // Fetch files
  const files = await db.fileManagerFile.findMany({
    where: {
      uniqueId: { in: job.data.fileIds },
      userId: job.data.userId,
      deletedAt: null,
    },
  });

  // TODO: Download from S3 and create zip archive
  // For now, just log the job
  console.log(`Zip job ${job.id}: processing ${files.length} files`);

  return { success: true, fileCount: files.length };
}

export async function processCleanupJob(job: Job<CleanupJobData>) {
  const { db } = await import('@/server/db');

  const days = job.data.olderThanDays ?? 30;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  if (job.data.type === 'trash' || job.data.type === 'all') {
    const deletedFiles = await db.fileManagerFile.deleteMany({
      where: { deletedAt: { not: null, lt: cutoff } },
    });
    console.log(`Cleanup: deleted ${deletedFiles.count} trashed files`);
  }

  if (job.data.type === 'shares' || job.data.type === 'all') {
    const expiredShares = await db.share.deleteMany({
      where: {
        expireIn: { not: null },
        createdAt: { lt: cutoff },
      },
    });
    console.log(`Cleanup: deleted ${expiredShares.count} expired shares`);
  }

  if (job.data.type === 'zips' || job.data.type === 'all') {
    const expiredZips = await db.zip.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    console.log(`Cleanup: deleted ${expiredZips.count} expired zips`);
  }

  return { success: true };
}

// ─── Helper Functions ──────────────────────────────────────────

export async function sendEmailJob(data: EmailJobData) {
  return emailQueue.add('send-email', data);
}

export async function createZipJob(data: ZipJobData) {
  return zipQueue.add('create-zip', data);
}

export async function runCleanup(type: CleanupJobData['type'], olderThanDays?: number) {
  return cleanupQueue.add('cleanup', { type, olderThanDays });
}

export { connection };
