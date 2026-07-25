// src/server/trpc/procedures.ts
import { TRPCError } from '@trpc/server';
import { t } from './index';
import { can, type UserContext } from '@/server/auth/rbac/ability';
import { Permission } from '@/server/auth/rbac/permissions';

export const publicProcedure = t.procedure;

// ─── Activity Tracking ──────────────────────────────────────────
// Throttle to every 5 minutes per user to avoid DB spam
const activityThrottle = new Map<string, number>();
const ACTIVITY_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  // Track user activity (throttled)
  const userId = ctx.session.user.id;
  const now = Date.now();
  const lastUpdate = activityThrottle.get(userId) ?? 0;
  if (now - lastUpdate > ACTIVITY_THROTTLE_MS) {
    activityThrottle.set(userId, now);
    // Fire-and-forget DB update
    import('@/server/db').then(({ db }) => {
      db.user.update({
        where: { id: Number(userId) },
        data: { lastActivityAt: new Date() },
      }).catch(() => {});
    }).catch(() => {});
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const verifiedProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    if (!ctx.session.user.emailVerified) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Email verification required',
      });
    }
    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
      },
    });
  },
);

export function roleProcedure(role: string) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const userRole: UserContext = { role: ctx.session.user.role };
    if (!can(userRole).atLeast(role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Requires ${role} role or higher`,
      });
    }
    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
      },
    });
  });
}

export function permissionProcedure(permission: Permission) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const userRole: UserContext = { role: ctx.session.user.role };
    if (!can(userRole).do(permission)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Missing permission: ${permission}`,
      });
    }
    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
      },
    });
  });
}

export const masterProcedure = roleProcedure('master');
export const adminProcedure = roleProcedure('admin');
export const managerProcedure = roleProcedure('manager');
