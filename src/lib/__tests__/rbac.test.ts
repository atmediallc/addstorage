import { describe, it, expect } from 'vitest';
import { can } from '@/server/auth/rbac/ability';
import { Permission } from '@/server/auth/rbac/permissions';
import { ROLE_LEVELS } from '@/server/auth/rbac/roles';

describe('RBAC Ability Builder', () => {
  const master = { role: 'master' };
  const admin = { role: 'admin' };
  const editor = { role: 'editor' };
  const viewer = { role: 'viewer' };
  const user = { role: 'user' };

  describe('can().do() — permission checks', () => {
    it('master has all permissions', () => {
      expect(can(master).do(Permission.USER_DELETE)).toBe(true);
      expect(can(master).do(Permission.BILLING_EDIT)).toBe(true);
      expect(can(master).do(Permission.SYSTEM_SETTINGS)).toBe(true);
    });

    it('admin can manage users but not billing', () => {
      expect(can(admin).do(Permission.USER_CREATE)).toBe(true);
      expect(can(admin).do(Permission.USER_DELETE)).toBe(true);
      expect(can(admin).do(Permission.BILLING_EDIT)).toBe(false);
      expect(can(admin).do(Permission.BILLING_VIEW)).toBe(false);
    });

    it('editor can manage files but not users', () => {
      expect(can(editor).do(Permission.FILE_CREATE)).toBe(true);
      expect(can(editor).do(Permission.FILE_DELETE)).toBe(true);
      expect(can(editor).do(Permission.USER_CREATE)).toBe(false);
      expect(can(editor).do(Permission.USER_LIST)).toBe(false);
    });

    it('viewer can only read', () => {
      expect(can(viewer).do(Permission.FILE_READ)).toBe(true);
      expect(can(viewer).do(Permission.FOLDER_READ)).toBe(true);
      expect(can(viewer).do(Permission.FILE_CREATE)).toBe(false);
      expect(can(viewer).do(Permission.FILE_DELETE)).toBe(false);
    });

    it('user can manage own files but not others', () => {
      expect(can(user).do(Permission.FILE_CREATE)).toBe(true);
      expect(can(user).do(Permission.FILE_READ)).toBe(true);
      expect(can(user).do(Permission.USER_LIST)).toBe(false);
      expect(can(user).do(Permission.AUDIT_READ)).toBe(false);
    });
  });

  describe('can().atLeast() — hierarchy checks', () => {
    it('master is at least admin', () => {
      expect(can(master).atLeast('admin')).toBe(true);
    });

    it('admin is at least editor', () => {
      expect(can(admin).atLeast('editor')).toBe(true);
    });

    it('editor is NOT at least admin', () => {
      expect(can(editor).atLeast('admin')).toBe(false);
    });

    it('viewer is NOT at least user', () => {
      expect(can(viewer).atLeast('user')).toBe(false);
    });

    it('same level matches', () => {
      expect(can(editor).atLeast('editor')).toBe(true);
    });
  });

  describe('can().is() — exact role check', () => {
    it('matches exact role', () => {
      expect(can(admin).is('admin')).toBe(true);
      expect(can(admin).is('master')).toBe(false);
    });
  });

  describe('role levels are ordered correctly', () => {
    it('master > admin > manager > editor > support > accountant > user > viewer', () => {
      const roles: string[] = [
        'master',
        'admin',
        'manager',
        'editor',
        'support',
        'accountant',
        'user',
        'viewer',
      ];
      for (let i = 0; i < roles.length - 1; i++) {
        expect(ROLE_LEVELS[roles[i]!]!).toBeGreaterThan(
          ROLE_LEVELS[roles[i + 1]!]!,
        );
      }
    });
  });
});
