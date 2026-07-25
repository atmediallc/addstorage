// src/server/trpc/routers/auth.ts
import { router } from '../index';
import { protectedProcedure } from '../procedures';
import { z } from 'zod';
import { auth } from '@/server/auth';

export const authRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    const { session } = ctx;
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      avatar: session.user.avatar,
      emailVerified: session.user.emailVerified,
    };
  }),

  sessions: protectedProcedure.query(async ({ ctx }) => {
    // Use Better Auth's internal API to list sessions
    // We pass the session headers to identify the user
    const sessions = await auth.api.listSessions({
      headers: ctx.headers ?? new Headers(),
    });

    // Better Auth returns sessions with `id`, `userAgent`, etc.
    // Mark the current session
    return (Array.isArray(sessions) ? sessions : []).map(
      (s: Record<string, unknown>) => ({
        id: s.id,
        ipAddress: s.ipAddress ?? null,
        userAgent: s.userAgent ?? null,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        isCurrent: s.id === ctx.session.session.id,
      }),
    );
  }),

  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await auth.api.revokeSession({
        body: {
          token: input.sessionId,
        },
        headers: ctx.headers ?? new Headers(),
      });

      return { success: true };
    }),

  revokeAllSessions: protectedProcedure.mutation(async ({ ctx }) => {
    await auth.api.revokeSessions({
      headers: ctx.headers ?? new Headers(),
    });

    return { success: true };
  }),

  // ─── Confirm Password ────────────────────────────────────────────
  confirmPassword: protectedProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.session.user.id);

      // Verify password against stored hash
      const user = await ctx.db.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      // Use BetterAuth to verify the password
      const { verifyPassword } = await import('better-auth/crypto');
      const isValid = await verifyPassword({
        password: input.password,
        hash: user.password,
      });

      if (!isValid) {
        throw new Error('Invalid password');
      }

      return { success: true };
    }),
});
