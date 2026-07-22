import { describe, it, expect } from 'vitest';
import { AuditAction } from '@/server/auth/audit';

describe('AuditAction constants', () => {
  it('defines all security event actions', () => {
    expect(AuditAction.REGISTER).toBe('auth.register');
    expect(AuditAction.LOGIN).toBe('auth.login');
    expect(AuditAction.LOGIN_FAILED).toBe('auth.login.failed');
    expect(AuditAction.LOGOUT).toBe('auth.logout');
    expect(AuditAction.LOGOUT_ALL).toBe('auth.logout.all');
    expect(AuditAction.PASSWORD_CHANGE).toBe('auth.password.change');
    expect(AuditAction.PASSWORD_RESET_REQUESTED).toBe(
      'auth.password.reset.requested',
    );
    expect(AuditAction.PASSWORD_RESET_COMPLETED).toBe(
      'auth.password.reset.completed',
    );
    expect(AuditAction.EMAIL_VERIFIED).toBe('auth.email.verified');
    expect(AuditAction.ROLE_CHANGED).toBe('auth.role.changed');
    expect(AuditAction.SESSION_REVOKED).toBe('auth.session.revoked');
  });
});
