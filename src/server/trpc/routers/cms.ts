// src/server/trpc/routers/cms.ts
import { router } from '../index';
import { publicProcedure } from '../procedures';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const cmsRouter = router({
  getPublicSettings: publicProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.setting.findMany({
      where: {
        name: {
          in: [
            'app_name',
            'app_description',
            'allow_homepage',
            'is_saas',
            'contact_email',
            'stripe_public_key',
          ],
        },
      },
    });

    const parsed: Record<string, string> = {
      app_name: 'TutisCloud',
      allow_homepage: '1',
      is_saas: '1',
    };

    for (const s of settings) {
      if (s.value !== null) {
        parsed[s.name] = s.value;
      }
    }

    return parsed;
  }),

  getPage: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const page = await ctx.db.page.findUnique({
        where: { slug: input.slug, visibility: true },
      });

      if (!page) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Page not found',
        });
      }

      return {
        title: page.title,
        content: page.content,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      };
    }),
});
