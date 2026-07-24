// src/server/jobs/worker.ts
// BullMQ worker — processes background jobs
// Run with: npx tsx src/server/jobs/worker.ts

import { Worker } from 'bullmq';
import {
  connection,
  processEmailJob,
  processZipJob,
  processCleanupJob,
  EmailJobData,
  ZipJobData,
  CleanupJobData,
} from './queue';

console.log('Starting job worker...');

// ─── Email Worker ──────────────────────────────────────────────

const emailWorker = new Worker<EmailJobData>(
  'email',
  async (job) => {
    console.log(`Processing email job ${job.id}...`);
    return processEmailJob(job);
  },
  { connection, concurrency: 5 },
);

emailWorker.on('completed', (job) => {
  console.log(`Email job ${job.id} completed: sent to ${job.data.to}`);
});

emailWorker.on('failed', (job, error) => {
  console.error(`Email job ${job?.id} failed:`, error.message);
});

// ─── Zip Worker ────────────────────────────────────────────────

const zipWorker = new Worker<ZipJobData>(
  'zip',
  async (job) => {
    console.log(`Processing zip job ${job.id}...`);
    return processZipJob(job);
  },
  { connection, concurrency: 2 },
);

zipWorker.on('completed', (job) => {
  console.log(`Zip job ${job.id} completed`);
});

zipWorker.on('failed', (job, error) => {
  console.error(`Zip job ${job?.id} failed:`, error.message);
});

// ─── Cleanup Worker ────────────────────────────────────────────

const cleanupWorker = new Worker<CleanupJobData>(
  'cleanup',
  async (job) => {
    console.log(`Processing cleanup job ${job.id}...`);
    return processCleanupJob(job);
  },
  { connection, concurrency: 1 },
);

cleanupWorker.on('completed', (job) => {
  console.log(`Cleanup job ${job.id} completed`);
});

cleanupWorker.on('failed', (job, error) => {
  console.error(`Cleanup job ${job?.id} failed:`, error.message);
});

// ─── Graceful Shutdown ─────────────────────────────────────────

async function shutdown() {
  console.log('Shutting down worker...');
  await emailWorker.close();
  await zipWorker.close();
  await cleanupWorker.close();
  await connection.quit();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('Worker started. Waiting for jobs...');
