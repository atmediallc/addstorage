// src/server/trpc/routers/notifications.ts
import { router } from '../index';
import { protectedProcedure } from '../procedures';
import { z } from 'zod';

export const notificationsRouter = router({
  // ─── Notifications ──────────────────────────────────────────────
  list: protectedProcedure
    .input(z.object({ unreadOnly: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const userId = Number(ctx.session.user.id);
      const notifications = await ctx.db.notification.findMany({
        where: {
          userId,
          ...(input?.unreadOnly ? { read: false } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return notifications;
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = Number(ctx.session.user.id);
    const count = await ctx.db.notification.count({
      where: { userId, read: false },
    });
    return count;
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.notification.update({
        where: { id: input.id },
        data: { read: true },
      });
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = Number(ctx.session.user.id);
    await ctx.db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.notification.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // ─── Activity Log ──────────────────────────────────────────────
  getRecentActivity: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const userId = Number(ctx.session.user.id);
      const activities = await ctx.db.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: input?.limit ?? 20,
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          createdAt: true,
        },
      });
      return activities;
    }),

  getAllActivity: protectedProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const activities = await ctx.db.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: input?.limit ?? 50,
        skip: input?.offset ?? 0,
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });
      return activities;
    }),
});

// Helper to create activity logs
export async function logActivity(
  db: any,
  userId: number,
  action: string,
  resource?: string,
  resourceId?: number,
  metadata?: Record<string, unknown>,
) {
  return db.auditLog.create({
    data: { userId, action, resource, resourceId, metadata },
  });
}

// Helper to create notifications
export async function createNotification(
  db: any,
  userId: number,
  title: string,
  message: string,
  type: string = 'info',
  link?: string,
) {
  return db.notification.create({
    data: { userId, title, message, type, link },
  });
}
