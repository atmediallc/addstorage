import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { unstable_cache } from "next/cache";

export const i18nRouter = createTRPCRouter({
  getTranslations: publicProcedure
    .input(z.object({ lang: z.string() }))
    .query(
      unstable_cache(
        async ({ input }) => {
          // Get language from database
          const language = await db.language.findUnique({
            where: { locale: input.lang },
            include: { strings: true },
          });

          if (!language) {
            throw new Error("Language not found");
          }

          // Format translations as key-value pairs
          const translations = language.strings.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
          }, {} as Record<string, string>);

          return translations;
        },
        ["translations", "lang"],
        {
          tags: ["translations"],
          revalidate: 3600, // Cache for 1 hour
        }
      )
    ),
});