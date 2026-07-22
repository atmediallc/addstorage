// src/hooks/use-permissions.ts
'use client';

import { useAuth } from './use-auth';
import { can, type AbilityBuilder } from '@/server/auth/rbac/ability';
import { Permission } from '@/server/auth/rbac/permissions';

export function usePermissions(): AbilityBuilder | null {
  const { user } = useAuth();
  if (!user) return null;
  return can({ role: user.role });
}

export function useHasPermission(permission: Permission): boolean {
  const ability = usePermissions();
  if (!ability) return false;
  return ability.do(permission);
}

export function useHasRole(role: string): boolean {
  const ability = usePermissions();
  if (!ability) return false;
  return ability.atLeast(role);
}
