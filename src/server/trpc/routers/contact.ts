// src/server/trpc/routers/contact.ts
import { router } from '../index';
import { publicProcedure } from '../procedures';
import { z } from 'zod';
import { sendContactEmail } from '@/lib/email/resend';
import { TRPCError } from '@trpc/server';

export const contactRouter = router({
  submitForm: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email'),
        message: z.string().min(1, 'Message is required'),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const contactEmail = process.env.ADMIN_EMAIL ?? 'admin@tutiscloud.com';
        await sendContactEmail(contactEmail, input.name, input.email, input.message);
        return { success: true };
      } catch (error) {
        console.error('Contact form submission error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to submit contact form',
        });
      }
    }),
});
