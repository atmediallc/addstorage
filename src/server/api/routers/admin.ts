import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { unstable_cache } from "next/cache";

export const adminRouter = createTRPCRouter({
  getParticipantUploads: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(
      unstable_cache(
        async ({ input }) => {
          // Get user's files and folders
          const files = await db.fileManagerFile.findMany({
            where: { userId: input.userId },
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
              size: true,
            },
            orderBy: { createdAt: "desc" },
          });

          const folders = await db.fileManagerFolder.findMany({
            where: { userId: input.userId },
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { createdAt: "desc" },
          });

          return {
            files,
            folders,
            totalFiles: files.length,
            totalFolders: folders.length,
          };
        },
        ["admin", "uploads", "userId"],
        {
          tags: ["admin"],
          revalidate: 3600, // Cache for 1 hour
        }
      )
    ),
});