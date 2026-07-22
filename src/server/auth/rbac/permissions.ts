// src/server/auth/rbac/permissions.ts
export enum Permission {
  // User management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_LIST = 'user:list',

  // Role management
  ROLE_ASSIGN = 'role:assign',
  ROLE_LIST = 'role:list',

  // File management
  FILE_CREATE = 'file:create',
  FILE_READ = 'file:read',
  FILE_UPDATE = 'file:update',
  FILE_DELETE = 'file:delete',
  FILE_SHARE = 'file:share',
  FILE_DOWNLOAD = 'file:download',

  // Folder management
  FOLDER_CREATE = 'folder:create',
  FOLDER_READ = 'folder:read',
  FOLDER_UPDATE = 'folder:update',
  FOLDER_DELETE = 'folder:delete',

  // Share management
  SHARE_CREATE = 'share:create',
  SHARE_READ = 'share:read',
  SHARE_UPDATE = 'share:update',
  SHARE_DELETE = 'share:delete',

  // Billing
  BILLING_VIEW = 'billing:view',
  BILLING_EDIT = 'billing:edit',

  // Admin panel
  ADMIN_PANEL = 'admin:panel',
  SYSTEM_SETTINGS = 'system:settings',

  // Audit
  AUDIT_READ = 'audit:read',
}

export type PermissionValue = `${Permission}`;
