import { router, publicProcedure } from '../index';
import { z } from 'zod';

export const placeholderRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }).optional())
    .query(({ input }) => {
      return { message: `Hello ${input?.name ?? 'World'}!` };
    }),
});
