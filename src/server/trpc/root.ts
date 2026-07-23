// src/server/trpc/root.ts
import { router } from './index';
import { authRouter } from './routers/auth';
import { filesRouter } from './routers/files';

export const appRouter = router({
  auth: authRouter,
  files: filesRouter,
});

export type AppRouter = typeof appRouter;
