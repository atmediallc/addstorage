import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { unstable_cache } from "next/cache";

export const languagesRouter = createTRPCRouter({
  getAdminLanguages: protectedProcedure
    .query(
      unstable_cache(
        async () => {
          // Get all languages with their string counts
          const languages = await db.language.findMany({
            include: {
              _count: {
                select: { strings: true },
              },
            },
            orderBy: { name: "asc" },
          });

          return languages.map((lang) => ({
            id: lang.id,
            name: lang.name,
            locale: lang.locale,
            stringCount: lang._count.strings,
            createdAt: lang.createdAt,
            updatedAt: lang.updatedAt,
          }));
        },
        ["languages", "admin"],
        {
          tags: ["languages"],
          revalidate: 3600, // Cache for 1 hour
        }
      )
    ),

  updateLanguage: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        locale: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Update language details
      const updatedLanguage = await db.language.update({
        where: { id: input.id },
        data: {
          name: input.name,
          locale: input.locale,
        },
      });

      return {
        success: true,
        language: {
          id: updatedLanguage.id,
          name: updatedLanguage.name,
          locale: updatedLanguage.locale,
        },
      };
    }),
});