import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { unstable_cache } from "next/cache";

export const notificationsRouter = createTRPCRouter({
  getUserNotifications: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        limit: z.number().default(20),
        cursor: z.string().optional(),
      })
    )
    .query(
      unstable_cache(
        async ({ input }) => {
          // Get user notifications with pagination
          const notifications = await db.notification.findMany({
            where: { userId: input.userId },
            orderBy: { createdAt: "desc" },
            take: input.limit + 1,
            cursor: input.cursor ? { id: input.cursor } : undefined,
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          });

          // Check if there are more notifications
          let nextCursor: typeof input.cursor | undefined = undefined;
          if (notifications.length > input.limit) {
            const nextItem = notifications.pop();
            nextCursor = nextItem?.id;
          }

          return {
            notifications: notifications.map((notification) => ({
              id: notification.id,
              type: notification.type,
              message: notification.message,
              read: notification.read,
              createdAt: notification.createdAt,
              sender: notification.sender,
            })),
            nextCursor,
          };
        },
        ["notifications", "user", "userId"],
        {
          tags: ["notifications"],
          revalidate: 3600, // Cache for 1 hour
        }
      )
    ),

  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ input }) => {
      // Mark notification as read
      await db.notification.update({
        where: { id: input.notificationId },
        data: { read: true },
      });

      return { success: true };
    }),
});