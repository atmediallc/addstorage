// src/server/auth/audit.ts
import { db } from '@/server/db';

export const AuditAction = {
  REGISTER: 'auth.register',
  LOGIN: 'auth.login',
  LOGIN_FAILED: 'auth.login.failed',
  LOGOUT: 'auth.logout',
  LOGOUT_ALL: 'auth.logout.all',
  PASSWORD_CHANGE: 'auth.password.change',
  PASSWORD_RESET_REQUESTED: 'auth.password.reset.requested',
  PASSWORD_RESET_COMPLETED: 'auth.password.reset.completed',
  EMAIL_VERIFIED: 'auth.email.verified',
  ROLE_CHANGED: 'auth.role.changed',
  SESSION_REVOKED: 'auth.session.revoked',
} as const;

export type AuditActionValue =
  (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditMetadata {
  ip?: string;
  userAgent?: string;
  oldRole?: string;
  newRole?: string;
  email?: string;
  [key: string]: unknown;
}

export async function logAuditEvent(
  userId: number,
  action: AuditActionValue,
  resource?: string,
  resourceId?: number,
  metadata?: AuditMetadata,
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        resource: resource ?? null,
        resourceId: resourceId ?? null,
        metadata: metadata != null ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });
  } catch (error) {
    // Audit logging must never crash the request
    console.error('Failed to write audit log:', { action, userId, error });
  }
}
