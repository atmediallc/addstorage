// src/server/trpc/root.ts
import { router } from './index';
import { authRouter } from './routers/auth';
import { filesRouter } from './routers/files';
import { adminRouter } from './routers/admin';

export const appRouter = router({
  auth: authRouter,
  files: filesRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
