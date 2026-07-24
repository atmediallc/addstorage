export const ROLES = {
  ADMIN: 'admin',
  MASTER: 'master',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const FILE_TYPES = {
  FOLDER: 'folder',
  FILE: 'file',
} as const;

export const SHARE_TYPES = {
  FILE: 'file',
  FILES: 'files',
  FOLDER: 'folder',
} as const;

export const SHARE_PERMISSIONS = {
  VISITOR: 'visitor',
  EDITOR: 'editor',
} as const;

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export const TRASH_RETENTION_DAYS = 30;

export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ─── Mimetype Blacklist ──────────────────────────────────────────
// Default blocked mimetypes (matching Laravel's mimetypes_blacklist setting)
// These are checked by splitting on '/' and comparing the type/subtype
export const BLOCKED_MIMETYPES = [
  'application/x-httpd-php',
  'application/x-php',
  'application/x-sh',
  'application/x-shellscript',
  'application/x-javascript',
  'application/javascript',
  'text/x-server-parsed-html',
  'text/x-server-parsed',
  'text/x-php',
  'text/x-perl',
  'text/x-python',
  'text/x-shellscript',
];

/**
 * Check if a mimetype is blocked by the blacklist.
 * Matches against the full mimetype (e.g. "application/x-php") or
 * just the type prefix (e.g. "application" would block all application/*).
 */
export function isMimetypeBlocked(mimetype: string): boolean {
  return BLOCKED_MIMETYPES.some(
    (blocked) => mimetype === blocked || mimetype.startsWith(blocked + '/'),
  );
}
