// src/server/trpc/root.ts
import { router } from './index';
import { authRouter } from './routers/auth';
import { filesRouter } from './routers/files';
import { adminRouter } from './routers/admin';
import { userRouter } from './routers/user';
import { billingRouter } from './routers/billing';
import { notificationsRouter } from './routers/notifications';

export const appRouter = router({
  auth: authRouter,
  files: filesRouter,
  admin: adminRouter,
  user: userRouter,
  billing: billingRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
