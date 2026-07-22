// src/server/trpc/index.ts
import { initTRPC } from '@trpc/server';
import { Context } from './context';

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof Error ? error.cause : null,
      },
    };
  },
});

export { t };
export const router = t.router;
