// src/server/trpc/routers/placeholder.ts
import { router } from '../index';
import { publicProcedure } from '../procedures';
import { z } from 'zod';

export const placeholderRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }).optional())
    .query(({ input }) => {
      return { message: `Hello ${input?.name ?? 'World'}!` };
    }),
});
