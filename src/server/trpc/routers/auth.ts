// src/server/trpc/routers/auth.ts
import { router } from '../index';
import { protectedProcedure } from '../procedures';

export const authRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    const { session } = ctx;
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      avatar: session.user.avatar,
      emailVerified: session.user.emailVerified,
    };
  }),
});
