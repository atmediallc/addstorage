import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { unstable_cache } from "next/cache";

export const cmsRouter = createTRPCRouter({
  getPage: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(
      unstable_cache(
        async ({ input }) => {
          // Get page from database
          const page = await db.page.findUnique({
            where: { slug: input.slug, visibility: true },
          });

          if (!page) {
            throw new Error("Page not found");
          }

          return {
            title: page.title,
            content: page.content,
            createdAt: page.createdAt,
            updatedAt: page.updatedAt,
          };
        },
        ["cms", "page", "slug"],
        {
          tags: ["cms"],
          revalidate: 3600, // Cache for 1 hour
        }
      )
    ),
});