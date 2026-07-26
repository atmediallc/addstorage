import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { unstable_cache } from "next/cache";

export const analyticsRouter = createTRPCRouter({
  getUserAnalytics: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(
      unstable_cache(
        async ({ input }) => {
          // Get user's file upload statistics
          const fileStats = await db.fileManagerFile.groupBy({
            by: ["type"],
            where: { userId: input.userId },
            _count: true,
            _sum: { size: true },
          });

          // Get user's share statistics
          const shareStats = await db.share.groupBy({
            by: ["type"],
            where: { userId: input.userId },
            _count: true,
          });

          // Get user's activity statistics
          const activityStats = await db.activity.groupBy({
            by: ["action"],
            where: { userId: input.userId },
            _count: true,
          });

          return {
            files: fileStats.map((stat) => ({
              type: stat.type,
              count: stat._count,
              totalSize: stat._sum.size || 0,
            })),
            shares: shareStats.map((stat) => ({
              type: stat.type,
              count: stat._count,
            })),
            activities: activityStats.map((stat) => ({
              action: stat.action,
              count: stat._count,
            })),
          };
        },
        ["analytics", "user", "userId"],
        {
          tags: ["analytics"],
          revalidate: 3600, // Cache for 1 hour
        }
      )
    ),
});