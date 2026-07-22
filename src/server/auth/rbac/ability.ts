// src/server/auth/rbac/ability.ts
import { Permission } from './permissions';
import { ROLE_LEVELS, ROLE_PERMISSIONS, type RoleName } from './roles';

export interface UserContext {
  role: string;
}

export interface AbilityBuilder {
  do: (action: Permission) => boolean;
  atLeast: (role: string) => boolean;
  is: (role: string) => boolean;
}

export function can(user: UserContext): AbilityBuilder {
  const userRole = user.role as RoleName;
  const userPermissions = ROLE_PERMISSIONS[userRole] ?? [];

  return {
    do: (action: Permission): boolean => {
      return userPermissions.includes(action);
    },
    atLeast: (role: string): boolean => {
      const requiredLevel = ROLE_LEVELS[role] ?? 0;
      const userLevel = ROLE_LEVELS[userRole] ?? 0;
      return userLevel >= requiredLevel;
    },
    is: (role: string): boolean => {
      return userRole === role;
    },
  };
}
