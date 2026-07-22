import { router } from './index';
import { placeholderRouter } from './routers/placeholder';

export const appRouter = router({
  placeholder: placeholderRouter,
});

export type AppRouter = typeof appRouter;
