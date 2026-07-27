// src/server/trpc/routers/deploy.ts
import { router } from '../index';
import { publicProcedure } from '../procedures';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

export const deployRouter = router({
  handleGithubWebhook: publicProcedure
    .input(z.object({ payload: z.string(), signature: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const secret = process.env.GITHUB_WEBHOOK_SECRET;
        if (!secret) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'GITHUB_WEBHOOK_SECRET is not configured',
          });
        }

        const signature = crypto
          .createHmac('sha256', secret)
          .update(input.payload)
          .digest('hex');

        if (`sha256=${signature}` !== input.signature) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid webhook signature',
          });
        }

        const payload = JSON.parse(input.payload);

        if (
          payload.ref === 'refs/heads/main' &&
          payload.repository.full_name === process.env.GITHUB_REPO
        ) {
          const { stdout, stderr } = await execAsync('bash scripts/deploy.sh', {
            cwd: process.cwd(),
          });

          if (stderr) {
            console.error('Deployment error:', stderr);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Deployment failed',
            });
          }

          return {
            success: true,
            message: 'Deployment initiated successfully',
            output: stdout,
          };
        }

        return {
          success: true,
          message: 'Webhook received but no deployment action taken',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Deployment webhook error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process deployment webhook',
        });
      }
    }),
});
