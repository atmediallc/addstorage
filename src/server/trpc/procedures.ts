// src/server/trpc/procedures.ts
import { TRPCError } from '@trpc/server';
import { t } from './index';
import { can, type UserContext } from '@/server/auth/rbac/ability';
import { Permission } from '@/server/auth/rbac/permissions';

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
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
