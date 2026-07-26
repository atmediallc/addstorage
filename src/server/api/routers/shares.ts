import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { unstable_cache } from "next/cache";

export const sharesRouter = createTRPCRouter({
  getOgMetadata: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(
      unstable_cache(
        async ({ input }) => {
          // Get share from database
          const share = await db.share.findUnique({
            where: { token: input.token },
            include: {
              user: true,
              file: true,
              folder: true,
            },
          });

          if (!share) {
            throw new Error("Share not found");
          }

          // Determine shared item name
          let itemName = "";
          if (share.file) {
            itemName = share.file.name || "File";
          } else if (share.folder) {
            itemName = share.folder.name || "Folder";
          }

          return {
            title: `${share.user.name} shared ${itemName}`,
            description: `View and download ${itemName} shared by ${share.user.name}`,
            image: share.user.avatar || "/default-avatar.png",
            url: `${process.env.NEXTAUTH_URL}/s/${share.token}`,
          };
        },
        ["shares", "og-metadata", "token"],
        {
          tags: ["shares"],
          revalidate: 3600, // Cache for 1 hour
        }
      )
    ),
});