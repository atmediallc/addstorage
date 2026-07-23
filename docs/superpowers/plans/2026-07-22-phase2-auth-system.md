# Phase 2: Enterprise Auth System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement complete authentication, authorization (RBAC with 8 roles + 30 permissions), session management, audit logging, email verification via Resend, and production-ready auth UI.

**Architecture:** Custom typed RBAC engine with compile-time permission constants. Better Auth handles sessions, email verification, and password reset. Resend sends transactional emails. Next.js middleware for fast route-level redirects. tRPC procedures compose role/permission checks. Audit logs written on every security event.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Prisma 7 (adapter pattern), Better Auth 1.6, tRPC 11, Resend + @react-email/render, React Hook Form + Zod, Vitest, Playwright, TailwindCSS

## Global Constraints

- TypeScript strict mode — no `any`, no unsafe casts
- pnpm as package manager
- ESLint + Prettier configured
- All Prisma models use `@map` for snake_case table/column names
- Permissions are compile-time constants — never DB-driven, never hardcoded strings in business logic
- `can(user).do(Permission.X)` pattern everywhere — no direct role string comparisons
- Every security event must be logged to audit_logs
- Generic error messages — never reveal whether an email exists
- Frequent commits — one commit per task
- Tests before implementation (TDD where feasible)

---

## File Structure

```
src/
  server/
    auth/
      index.ts                    — MODIFY (add email verification, forgot password, Resend config)
      rbac/
        roles.ts                  — CREATE (8 roles, hierarchy levels)
        permissions.ts            — CREATE (typed permission constants)
        ability.ts                — CREATE (can/ability checker)
        index.ts                  — CREATE (re-exports)
      audit.ts                    — CREATE (logAuditEvent utility)
    trpc/
      index.ts                    — MODIFY (replace adminProcedure, add verifiedProcedure, roleProcedure, permissionProcedure)
      procedures.ts               — CREATE (centralized procedure definitions)
      context.ts                  — MODIFY (enrich session with user role)
      root.ts                     — MODIFY (wire new routers)
      routers/
        _app.ts                   — MODIFY (add auth router exports)
        auth.ts                   — CREATE (auth tRPC procedures: me, sessions, changeRole)
        admin.ts                  — CREATE (admin tRPC procedures: users CRUD, settings)
  app/
    (auth)/
      layout.tsx                  — MODIFY (add auth-specific layout styling)
      login/
        page.tsx                  — CREATE
      register/
        page.tsx                  — CREATE
      forgot-password/
        page.tsx                  — CREATE
      reset-password/
        page.tsx                  — CREATE
      verify-email/
        page.tsx                  — CREATE
    (dashboard)/
      layout.tsx                  — MODIFY (add Header)
      settings/
        sessions/
          page.tsx                — CREATE
    admin/
      layout.tsx                  — CREATE (admin layout shell)
    layout.tsx                    — MODIFY (add toast provider)
  components/
    layout/
      header.tsx                  — CREATE (session-aware header)
    ui/
      toast.tsx                   — CREATE (toast notification system)
    auth/
      login-form.tsx              — CREATE
      register-form.tsx           — CREATE
      forgot-password-form.tsx    — CREATE
      reset-password-form.tsx     — CREATE
      unverified-banner.tsx       — CREATE
      auth-guard.tsx              — CREATE
  hooks/
    use-auth.ts                   — CREATE (useSession + role helpers)
    use-permissions.ts            — CREATE (client-side can() wrapper)
  lib/
    email/
      resend.ts                   — CREATE (Resend client)
      templates/
        verification.tsx          — CREATE
        reset-password.tsx        — CREATE
  middleware.ts                    — CREATE (Next.js middleware)
prisma/
  schema.prisma                   — MODIFY (add AuditLog, extend User)
tests/
  unit/
    rbac.test.ts                  — CREATE
    validators.test.ts            — CREATE
    audit.test.ts                 — CREATE
  integration/
    auth-flow.test.ts             — CREATE
    rbac-procedures.test.ts       — CREATE
  e2e/
    auth.spec.ts                  — CREATE
    playwright.config.ts          — CREATE
```

---

## Task 1: Install Dependencies & Extend Prisma Schema

**Files:**
- Modify: `package.json` (new deps)
- Modify: `prisma/schema.prisma` (add AuditLog model, extend User)
- Modify: `src/server/db/index.ts` (verify Prisma client generates)

**Interfaces:**
- Produces: `AuditLog` model, extended `User` model with security fields

- [ ] **Step 1: Install new dependencies**

```bash
pnpm add resend @react-email/render react-hook-form @hookform/resolvers
pnpm add -D playwright @playwright/test @types/react-hook-form
```

- [ ] **Step 2: Extend User model in Prisma schema**

Add these fields to the `User` model in `prisma/schema.prisma`, after the existing `role` field:

```prisma
  lastLoginAt         DateTime?    @map("last_login_at")
  lastActivityAt      DateTime?    @map("last_activity_at")
  failedLoginAttempts Int          @default(0) @map("failed_login_attempts")
  lockedUntil         DateTime?    @map("locked_until")
  passwordChangedAt   DateTime?    @map("password_changed_at")
  deletedAt           DateTime?    @map("deleted_at")
  timezone            String?
  locale              String?
  twoFactorEnabled    Boolean      @default(false) @map("two_factor_enabled")
```

- [ ] **Step 3: Add AuditLog model**

Add at the end of `prisma/schema.prisma`, before the `FailedJob` model:

```prisma
// ─── Audit Log ────────────────────────────────────────────────

model AuditLog {
  id         Int      @id @default(autoincrement())
  userId     Int      @map("user_id")
  action     String
  resource   String?
  resourceId Int?     @map("resource_id")
  metadata   Json?
  createdAt  DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}
```

Also add `auditLogs AuditLog[]` to the User model relations.

- [ ] **Step 4: Validate schema and generate client**

```bash
npx prisma validate
npx prisma generate
```

Expected: Schema valid, client generated with no errors.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml prisma/schema.prisma
git commit -m "feat: install auth deps, extend User model, add AuditLog schema"
```

---

## Task 2: RBAC Engine — Roles, Permissions, Ability

**Files:**
- Create: `src/server/auth/rbac/roles.ts`
- Create: `src/server/auth/rbac/permissions.ts`
- Create: `src/server/auth/rbac/ability.ts`
- Create: `src/server/auth/rbac/index.ts`
- Create: `src/lib/__tests__/rbac.test.ts`

**Interfaces:**
- Produces: `can(user).do(Permission.X)`, `can(user).atLeast('admin')`, `ROLE_LEVELS`, `ROLE_PERMISSIONS`

- [ ] **Step 1: Create permissions.ts**

```typescript
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
```

- [ ] **Step 2: Create roles.ts**

```typescript
// src/server/auth/rbac/roles.ts
import { Permission } from './permissions';

export const ROLE_LEVELS: Record<string, number> = {
  master: 100,
  admin: 80,
  manager: 60,
  editor: 40,
  support: 30,
  accountant: 20,
  user: 10,
  viewer: 0,
} as const;

export type RoleName = keyof typeof ROLE_LEVELS;

export const ROLE_LABELS: Record<RoleName, string> = {
  master: 'Master',
  admin: 'Admin',
  manager: 'Manager',
  editor: 'Editor',
  support: 'Support',
  accountant: 'Accountant',
  user: 'User',
  viewer: 'Viewer',
};

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  master: Object.values(Permission),
  admin: [
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_LIST,
    Permission.ROLE_ASSIGN,
    Permission.ROLE_LIST,
    Permission.FILE_CREATE,
    Permission.FILE_READ,
    Permission.FILE_UPDATE,
    Permission.FILE_DELETE,
    Permission.FILE_SHARE,
    Permission.FILE_DOWNLOAD,
    Permission.FOLDER_CREATE,
    Permission.FOLDER_READ,
    Permission.FOLDER_UPDATE,
    Permission.FOLDER_DELETE,
    Permission.SHARE_CREATE,
    Permission.SHARE_READ,
    Permission.SHARE_UPDATE,
    Permission.SHARE_DELETE,
    Permission.ADMIN_PANEL,
    Permission.SYSTEM_SETTINGS,
    Permission.AUDIT_READ,
  ],
  manager: [
    Permission.USER_READ,
    Permission.USER_LIST,
    Permission.FILE_CREATE,
    Permission.FILE_READ,
    Permission.FILE_UPDATE,
    Permission.FILE_DELETE,
    Permission.FILE_SHARE,
    Permission.FILE_DOWNLOAD,
    Permission.FOLDER_CREATE,
    Permission.FOLDER_READ,
    Permission.FOLDER_UPDATE,
    Permission.FOLDER_DELETE,
    Permission.SHARE_CREATE,
    Permission.SHARE_READ,
    Permission.SHARE_UPDATE,
    Permission.SHARE_DELETE,
    Permission.AUDIT_READ,
  ],
  editor: [
    Permission.FILE_CREATE,
    Permission.FILE_READ,
    Permission.FILE_UPDATE,
    Permission.FILE_DELETE,
    Permission.FILE_SHARE,
    Permission.FILE_DOWNLOAD,
    Permission.FOLDER_CREATE,
    Permission.FOLDER_READ,
    Permission.FOLDER_UPDATE,
    Permission.FOLDER_DELETE,
    Permission.SHARE_CREATE,
    Permission.SHARE_READ,
  ],
  support: [
    Permission.USER_READ,
    Permission.USER_LIST,
    Permission.FILE_READ,
    Permission.FOLDER_READ,
    Permission.SHARE_READ,
    Permission.AUDIT_READ,
  ],
  accountant: [
    Permission.BILLING_VIEW,
    Permission.USER_READ,
    Permission.USER_LIST,
    Permission.AUDIT_READ,
  ],
  user: [
    Permission.FILE_CREATE,
    Permission.FILE_READ,
    Permission.FILE_UPDATE,
    Permission.FILE_DELETE,
    Permission.FILE_SHARE,
    Permission.FILE_DOWNLOAD,
    Permission.FOLDER_CREATE,
    Permission.FOLDER_READ,
    Permission.SHARE_CREATE,
    Permission.SHARE_READ,
  ],
  viewer: [
    Permission.FILE_READ,
    Permission.FOLDER_READ,
  ],
};
```

- [ ] **Step 3: Create ability.ts**

```typescript
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
```

- [ ] **Step 4: Create rbac/index.ts**

```typescript
// src/server/auth/rbac/index.ts
export { Permission, type PermissionValue } from './permissions';
export {
  ROLE_LEVELS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type RoleName,
} from './roles';
export { can, type AbilityBuilder, type UserContext } from './ability';
```

- [ ] **Step 5: Write RBAC unit tests**

```typescript
// src/lib/__tests__/rbac.test.ts
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
      const roles = ['master', 'admin', 'manager', 'editor', 'support', 'accountant', 'user', 'viewer'];
      for (let i = 0; i < roles.length - 1; i++) {
        expect(ROLE_LEVELS[roles[i]]).toBeGreaterThan(ROLE_LEVELS[roles[i + 1]]);
      }
    });
  });
});
```

- [ ] **Step 6: Run RBAC tests**

```bash
pnpm vitest run src/lib/__tests__/rbac.test.ts
```

Expected: All tests pass.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/server/auth/rbac/ src/lib/__tests__/rbac.test.ts
git commit -m "feat: add RBAC engine with 8 roles, 30 permissions, ability builder, and tests"
```

---

## Task 3: Audit Log Utility

**Files:**
- Create: `src/server/auth/audit.ts`
- Create: `src/lib/__tests__/audit.test.ts`

**Interfaces:**
- Consumes: `db` from `@/server/db` (Prisma client)
- Produces: `logAuditEvent(userId, action, resource?, resourceId?, metadata?)`

- [ ] **Step 1: Write audit unit test**

```typescript
// src/lib/__tests__/audit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditAction } from '@/server/auth/audit';

describe('AuditAction constants', () => {
  it('defines all security event actions', () => {
    expect(AuditAction.REGISTER).toBe('auth.register');
    expect(AuditAction.LOGIN).toBe('auth.login');
    expect(AuditAction.LOGIN_FAILED).toBe('auth.login.failed');
    expect(AuditAction.LOGOUT).toBe('auth.logout');
    expect(AuditAction.LOGOUT_ALL).toBe('auth.logout.all');
    expect(AuditAction.PASSWORD_CHANGE).toBe('auth.password.change');
    expect(AuditAction.PASSWORD_RESET_REQUESTED).toBe('auth.password.reset.requested');
    expect(AuditAction.PASSWORD_RESET_COMPLETED).toBe('auth.password.reset.completed');
    expect(AuditAction.EMAIL_VERIFIED).toBe('auth.email.verified');
    expect(AuditAction.ROLE_CHANGED).toBe('auth.role.changed');
    expect(AuditAction.SESSION_REVOKED).toBe('auth.session.revoked');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/lib/__tests__/audit.test.ts
```

Expected: FAIL — `AuditAction` not found.

- [ ] **Step 3: Create audit.ts**

```typescript
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

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];

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
        metadata: metadata ?? undefined,
      },
    });
  } catch (error) {
    // Audit logging must never crash the request
    console.error('Failed to write audit log:', { action, userId, error });
  }
}
```

- [ ] **Step 4: Run audit test**

```bash
pnpm vitest run src/lib/__tests__/audit.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/audit.ts src/lib/__tests__/audit.test.ts
git commit -m "feat: add audit log utility with typed security event constants"
```

---

## Task 4: Resend Email Client & Templates

**Files:**
- Create: `src/lib/email/resend.ts`
- Create: `src/lib/email/templates/verification.tsx`
- Create: `src/lib/email/templates/reset-password.tsx`

**Interfaces:**
- Produces: `sendVerificationEmail(to, url, name)`, `sendResetPasswordEmail(to, url, name)`

- [ ] **Step 1: Create Resend client**

```typescript
// src/lib/email/resend.ts
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { VerificationEmail } from './templates/verification';
import { ResetPasswordEmail } from './templates/reset-password';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.EMAIL_FROM ?? 'TutisCloud <noreply@tutiscloud.com>';

export async function sendVerificationEmail(
  to: string,
  url: string,
  userName: string,
): Promise<void> {
  const html = render(VerificationEmail({ url, userName }));
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: 'Verify your email — TutisCloud',
    html,
  });
}

export async function sendResetPasswordEmail(
  to: string,
  url: string,
  userName: string,
): Promise<void> {
  const html = render(ResetPasswordEmail({ url, userName }));
  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: 'Reset your password — TutisCloud',
    html,
  });
}
```

- [ ] **Step 2: Create verification email template**

```tsx
// src/lib/email/templates/verification.tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
} from '@react-email/components';

interface VerificationEmailProps {
  url: string;
  userName: string;
}

export function VerificationEmail({ url, userName }: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address for TutisCloud</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Verify your email</Heading>
          <Text style={text}>
            Hi {userName},
          </Text>
          <Text style={text}>
            Thanks for signing up for TutisCloud. Please verify your email
            address to get started.
          </Text>
          <Button href={url} style={button}>
            Verify Email Address
          </Button>
          <Text style={text}>
            If the button doesn&apos;t work, copy and paste this link into your
            browser:
          </Text>
          <Link href={url} style={link}>
            {url}
          </Link>
          <Text style={footer}>
            If you didn&apos;t create an account, you can safely ignore this
            email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
};

const heading = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#1a1a1a',
  marginBottom: '16px',
};

const text = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#374151',
  marginBottom: '16px',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  marginBottom: '16px',
};

const link = {
  fontSize: '14px',
  color: '#2563eb',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
};

const footer = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#9ca3af',
  marginTop: '32px',
};
```

- [ ] **Step 3: Create reset password email template**

```tsx
// src/lib/email/templates/reset-password.tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
} from '@react-email/components';

interface ResetPasswordEmailProps {
  url: string;
  userName: string;
}

export function ResetPasswordEmail({ url, userName }: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your TutisCloud password</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Reset your password</Heading>
          <Text style={text}>
            Hi {userName},
          </Text>
          <Text style={text}>
            We received a request to reset the password for your TutisCloud
            account. Click the button below to choose a new password.
          </Text>
          <Button href={url} style={button}>
            Reset Password
          </Button>
          <Text style={text}>
            If the button doesn&apos;t work, copy and paste this link into your
            browser:
          </Text>
          <Link href={url} style={link}>
            {url}
          </Link>
          <Text style={footer}>
            This link expires in 1 hour. If you didn&apos;t request a password
            reset, you can safely ignore this email — your password will remain
            unchanged.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
};

const heading = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#1a1a1a',
  marginBottom: '16px',
};

const text = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#374151',
  marginBottom: '16px',
};

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  marginBottom: '16px',
};

const link = {
  fontSize: '14px',
  color: '#2563eb',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
};

const footer = {
  fontSize: '14px',
  lineHeight: '24px',
  color: '#9ca3af',
  marginTop: '32px',
};
```

- [ ] **Step 4: Add RESEND_API_KEY and EMAIL_FROM to .env.example**

Append to `.env.example`:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
EMAIL_FROM=TutisCloud <noreply@tutiscloud.com>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/email/ .env.example
git commit -m "feat: add Resend email client with verification and reset password templates"
```

---

## Task 5: Update Better Auth Config — Email Verification + Forgot Password

**Files:**
- Modify: `src/server/auth/index.ts`

**Interfaces:**
- Consumes: `sendVerificationEmail`, `sendResetPasswordEmail` from Task 4
- Consumes: `logAuditEvent`, `AuditAction` from Task 3

- [ ] **Step 1: Rewrite Better Auth config**

Replace the entire contents of `src/server/auth/index.ts`:

```typescript
// src/server/auth/index.ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { db } from '@/server/db';
import { sendVerificationEmail, sendResetPasswordEmail } from '@/lib/email/resend';

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    expiresIn: 3600, // 1 hour
  },
  sendVerificationEmail: async ({ user, token, url }) => {
    await sendVerificationEmail(user.email, url, user.name);
  },
  forgotPassword: {
    sendResetEmail: async ({ user, token, url }) => {
      await sendResetPasswordEmail(user.email, url, user.name);
    },
    expiresIn: 3600, // 1 hour
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // Refresh every 24h
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
      },
      avatar: {
        type: 'string',
        nullable: true,
      },
      stripeId: {
        type: 'string',
        nullable: true,
      },
      cardBrand: {
        type: 'string',
        nullable: true,
      },
      cardLastFour: {
        type: 'string',
        nullable: true,
      },
      lastLoginAt: {
        type: 'date',
        nullable: true,
      },
      lastActivityAt: {
        type: 'date',
        nullable: true,
      },
      failedLoginAttempts: {
        type: 'number',
        defaultValue: 0,
      },
      lockedUntil: {
        type: 'date',
        nullable: true,
      },
      deletedAt: {
        type: 'date',
        nullable: true,
      },
    },
  },
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'],
});

export type Session = typeof auth.$Infer.Session;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: No errors. If Better Auth's `sendVerificationEmail` signature differs, adjust accordingly.

- [ ] **Step 3: Commit**

```bash
git add src/server/auth/index.ts
git commit -m "feat: enable email verification and forgot password in Better Auth config"
```

---

## Task 6: Enriched tRPC Context & Procedure Definitions

**Files:**
- Modify: `src/server/trpc/context.ts`
- Modify: `src/server/trpc/index.ts`
- Create: `src/server/trpc/procedures.ts`

**Interfaces:**
- Consumes: `auth` from `@/server/auth`, `can`, `Permission` from RBAC
- Produces: `protectedProcedure`, `verifiedProcedure`, `roleProcedure()`, `permissionProcedure()`, `masterProcedure`, `adminProcedure`, `managerProcedure`

- [ ] **Step 1: Create procedures.ts**

```typescript
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

export const verifiedProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session.user.emailVerifiedAt) {
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
});

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
```

- [ ] **Step 2: Update tRPC index.ts — remove old procedures, export t**

```typescript
// src/server/trpc/index.ts
import { initTRPC } from '@trpc/server';
import { Context } from './context';

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof Error ? error.cause : null,
      },
    };
  },
});

export { t };
export const router = t.router;
```

- [ ] **Step 3: Update context.ts — enrich session**

```typescript
// src/server/trpc/context.ts
import { db } from '@/server/db';
import { auth } from '@/server/auth';

export async function createContext({ req }: { req: Request }) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  return {
    db,
    session: session ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

- [ ] **Step 4: Update root.ts — remove placeholder router**

```typescript
// src/server/trpc/root.ts
import { router } from './index';
import { authRouter } from './routers/auth';

export const appRouter = router({
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 5: Create auth router stub**

```typescript
// src/server/trpc/routers/auth.ts
import { router, protectedProcedure } from '../procedures';

export const authRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    const { session } = ctx;
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      avatar: session.user.avatar,
      emailVerifiedAt: session.user.emailVerifiedAt,
    };
  }),
});
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/server/trpc/
git commit -m "feat: add composable tRPC procedures — protected, verified, role, permission"
```

---

## Task 7: Auth Validators (Zod Schemas)

**Files:**
- Modify: `src/lib/validators.ts` (add auth-specific schemas)

**Interfaces:**
- Produces: `loginSchema`, `registerSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `changeRoleSchema`

- [ ] **Step 1: Add auth validators**

Add these exports to the end of `src/lib/validators.ts`:

```typescript
// ─── Auth (Phase 2 additions) ─────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms and conditions' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token is required'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/validators.ts
git commit -m "feat: add Zod validators for login, register, forgot password, reset password"
```

---

## Task 8: Next.js Middleware — Route Protection

**Files:**
- Create: `src/middleware.ts`

**Interfaces:**
- Consumes: Better Auth session cookie (reads via `better-auth/client/getSession`)

- [ ] **Step 1: Create middleware.ts**

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

function hasSessionCookie(request: NextRequest): boolean {
  try {
    const sessionCookie = getSessionCookie(request);
    return !!sessionCookie;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLoggedIn = hasSessionCookie(request);
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isAdminRoute = pathname.startsWith('/admin');

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL('/files', request.url));
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn && !isPublicRoute) {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, request.url),
    );
  }

  // Admin routes require admin role or higher (basic check — full RBAC in tRPC)
  // Note: This is a fast redirect only. Full role check happens in tRPC procedures.
  // We can't check role in middleware without decoding the session, so this is
  // session-presence only. Role enforcement is in tRPC + admin layout.
  if (isAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/files', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add Next.js middleware for route protection"
```

---

## Task 9: Auth Hooks — useAuth & usePermissions

**Files:**
- Create: `src/hooks/use-auth.ts`
- Create: `src/hooks/use-permissions.ts`

**Interfaces:**
- Consumes: `useSession` from `@/server/auth/client`, `can` from RBAC
- Produces: `useAuth()` returns session + role helpers, `usePermissions()` returns `can(user).do()` wrapper

- [ ] **Step 1: Create useAuth hook**

```typescript
// src/hooks/use-auth.ts
'use client';

import { useSession, signOut } from '@/server/auth/client';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useAuth() {
  const { data: session, isPending, error } = useSession();
  const router = useRouter();

  const user = session?.user ?? null;
  const isAuthenticated = !!session;
  const role = user?.role ?? null;

  const logout = useCallback(async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  }, [router]);

  return {
    session,
    user,
    isAuthenticated,
    isPending,
    error,
    role,
    logout,
  };
}
```

- [ ] **Step 2: Create usePermissions hook**

```typescript
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
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/
git commit -m "feat: add useAuth and usePermissions hooks for client-side auth/RBAC"
```

---

## Task 10: Toast Notification Component

**Files:**
- Create: `src/components/ui/toast.tsx`
- Modify: `src/components/providers.tsx` (add toast provider)

**Interfaces:**
- Produces: `useToast()` hook, `<Toaster />` component

- [ ] **Step 1: Create toast system**

```typescript
// src/components/ui/toast.tsx
'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all ${
              t.variant === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : t.variant === 'error'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : t.variant === 'warning'
                    ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
                    : 'border-blue-200 bg-blue-50 text-blue-800'
            }`}
          >
            <span className="text-sm font-medium">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-2 text-current opacity-50 hover:opacity-100"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
```

- [ ] **Step 2: Update providers.tsx to include Toaster**

Update `src/components/providers.tsx` — add ToastProvider around children:

```typescript
// src/components/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ToastProvider } from '@/components/ui/toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/trpc`,
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/toast.tsx src/components/providers.tsx
git commit -m "feat: add toast notification system with provider"
```

---

## Task 11: Auth Forms (Login, Register, Forgot Password, Reset Password)

**Files:**
- Create: `src/components/auth/login-form.tsx`
- Create: `src/components/auth/register-form.tsx`
- Create: `src/components/auth/forgot-password-form.tsx`
- Create: `src/components/auth/reset-password-form.tsx`
- Create: `src/components/auth/unverified-banner.tsx`
- Create: `src/components/auth/auth-guard.tsx`

**Interfaces:**
- Consumes: `useAuth()` from `@/hooks/use-auth`, `useToast()` from toast, Better Auth `signIn`/`signUp`, Zod validators from `@/lib/validators`

- [ ] **Step 1: Create login-form.tsx**

```tsx
// src/components/auth/login-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from '@/server/auth/client';
import { loginSchema, type LoginInput } from '@/lib/validators';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/toast';

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/files';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setIsLoading(true);
    setError(null);

    const { error: signInError } = await signIn.email({
      email: data.email,
      password: data.password,
      rememberMe: data.rememberMe,
    });

    if (signInError) {
      setError('Invalid email or password');
      setIsLoading(false);
      return;
    }

    toast('Welcome back!', 'success');
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            {...register('rememberMe')}
            className="rounded border-gray-300"
          />
          Remember me
        </label>
        <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">
          Forgot password?
        </a>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Signing in...' : 'Sign in'}
      </button>

      <p className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <a href="/register" className="font-medium text-blue-600 hover:underline">
          Sign up
        </a>
      </p>
    </form>
  );
}
```

- [ ] **Step 2: Create register-form.tsx**

```tsx
// src/components/auth/register-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signUp } from '@/server/auth/client';
import { registerSchema, type RegisterInput } from '@/lib/validators';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterInput) {
    setIsLoading(true);
    setError(null);

    const { error: signUpError } = await signUp.email({
      name: data.name,
      email: data.email,
      password: data.password,
    });

    if (signUpError) {
      setError(signUpError.message ?? 'Registration failed. Please try again.');
      setIsLoading(false);
      return;
    }

    toast('Account created! Check your email to verify.', 'success');
    router.push('/files');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          {...register('name')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div>
        <label className="flex items-start gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            {...register('acceptTerms')}
            className="mt-0.5 rounded border-gray-300"
          />
          <span>
            I accept the{' '}
            <a href="/terms" className="text-blue-600 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="mt-1 text-sm text-red-600">{errors.acceptTerms.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Creating account...' : 'Create account'}
      </button>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{' '}
        <a href="/login" className="font-medium text-blue-600 hover:underline">
          Sign in
        </a>
      </p>
    </form>
  );
}
```

- [ ] **Step 3: Create forgot-password-form.tsx**

```tsx
// src/components/auth/forgot-password-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validators';

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordInput) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forget-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });

      if (!res.ok) {
        // Generic message — never reveal whether email exists
        setSubmitted(true);
      } else {
        setSubmitted(true);
      }
    } catch {
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
          If an account exists with that email, we&apos;ve sent a password reset
          link. Please check your inbox.
        </div>
        <a href="/login" className="text-sm font-medium text-blue-600 hover:underline">
          ← Back to sign in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <p className="text-sm text-gray-600">
        Enter your email address and we&apos;ll send you a link to reset your
        password.
      </p>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Sending...' : 'Send reset link'}
      </button>

      <p className="text-center text-sm text-gray-600">
        Remember your password?{' '}
        <a href="/login" className="font-medium text-blue-600 hover:underline">
          Sign in
        </a>
      </p>
    </form>
  );
}
```

- [ ] **Step 4: Create reset-password-form.tsx**

```tsx
// src/components/auth/reset-password-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validators';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/toast';

export function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, email },
  });

  async function onSubmit(data: ResetPasswordInput) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: data.token,
          email: data.email,
          newPassword: data.password,
        }),
      });

      if (!res.ok) {
        setError('Invalid or expired reset link. Please try again.');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      toast('Password reset successfully!', 'success');
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  }

  if (!token || !email) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Invalid reset link. Please request a new one.
        </div>
        <a href="/forgot-password" className="text-sm font-medium text-blue-600 hover:underline">
          Request new reset link
        </a>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
          Your password has been reset successfully.
        </div>
        <button
          onClick={() => router.push('/login')}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Sign in with your new password →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <input type="hidden" {...register('token')} />
      <input type="hidden" {...register('email')} />

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          New Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Resetting...' : 'Reset password'}
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Create unverified-banner.tsx**

```tsx
// src/components/auth/unverified-banner.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

export function UnverifiedBanner() {
  const { user, isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isAuthenticated || !user || user.emailVerifiedAt || dismissed) {
    return null;
  }

  async function resendVerification() {
    setSending(true);
    try {
      await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user!.email }),
      });
      setSent(true);
    } catch {
      // Silent fail
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex items-center justify-between bg-yellow-50 px-4 py-2 text-sm text-yellow-800 border-b border-yellow-200">
      <span>
        Please verify your email address.{' '}
        {sent ? (
          <span className="font-medium">Verification email sent!</span>
        ) : (
          <button
            onClick={resendVerification}
            disabled={sending}
            className="font-medium underline hover:no-underline disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Resend verification email'}
          </button>
        )}
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-4 text-yellow-600 hover:text-yellow-800"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Create auth-guard.tsx**

```tsx
// src/components/auth/auth-guard.tsx
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, requiredRole, fallback }: AuthGuardProps) {
  const { isAuthenticated, isPending, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !isAuthenticated) {
      router.push('/login');
    }
  }, [isPending, isAuthenticated, router]);

  if (isPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback ?? null;
  }

  if (requiredRole && user) {
    const { can } = require('@/server/auth/rbac/ability');
    const ability = can({ role: user.role });
    if (!ability.atLeast(requiredRole)) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">Access Denied</h2>
            <p className="mt-2 text-sm text-gray-600">
              You don&apos;t have permission to access this page.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
```

- [ ] **Step 7: Create auth page layouts**

Create page files that compose the forms with the auth layout:

`src/app/(auth)/login/page.tsx`:
```tsx
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <>
      <h2 className="text-center text-2xl font-bold text-gray-900">
        Sign in to TutisCloud
      </h2>
      <div className="mt-8">
        <LoginForm />
      </div>
    </>
  );
}
```

`src/app/(auth)/register/page.tsx`:
```tsx
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <>
      <h2 className="text-center text-2xl font-bold text-gray-900">
        Create your account
      </h2>
      <div className="mt-8">
        <RegisterForm />
      </div>
    </>
  );
}
```

`src/app/(auth)/forgot-password/page.tsx`:
```tsx
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <>
      <h2 className="text-center text-2xl font-bold text-gray-900">
        Forgot your password?
      </h2>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
    </>
  );
}
```

`src/app/(auth)/reset-password/page.tsx`:
```tsx
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export default function ResetPasswordPage() {
  return (
    <>
      <h2 className="text-center text-2xl font-bold text-gray-900">
        Reset your password
      </h2>
      <div className="mt-8">
        <ResetPasswordForm />
      </div>
    </>
  );
}
```

`src/app/(auth)/verify-email/page.tsx`:
```tsx
export default function VerifyEmailPage() {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900">Email Verified</h2>
      <p className="mt-4 text-gray-600">
        Your email has been verified. You can now access all features.
      </p>
      <a
        href="/files"
        className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Go to Files
      </a>
    </div>
  );
}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/auth/ src/app/\(auth\)/
git commit -m "feat: add auth forms — login, register, forgot/reset password, unverified banner, auth guard"
```

---

## Task 12: Session-Aware Header

**Files:**
- Create: `src/components/layout/header.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/app/(auth)/layout.tsx`

**Interfaces:**
- Consumes: `useAuth()` from `@/hooks/use-auth`, `UnverifiedBanner`

- [ ] **Step 1: Create header.tsx**

```tsx
// src/components/layout/header.tsx
'use client';

import { useAuth } from '@/hooks/use-auth';
import { can } from '@/server/auth/rbac/ability';
import { UnverifiedBanner } from '@/components/auth/unverified-banner';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated || !user) return null;

  const ability = can({ role: user.role });
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <UnverifiedBanner />
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <a href="/files" className="text-lg font-bold text-gray-900">
          TutisCloud
        </a>

        <div className="flex items-center gap-4">
          {ability.atLeast('admin') && (
            <a
              href="/admin"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Admin
            </a>
          )}

          <div className="relative group">
            <button className="flex items-center gap-2 rounded-md p-1.5 hover:bg-gray-100">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                  {initials}
                </span>
              )}
              <div className="hidden text-left text-sm md:block">
                <div className="font-medium text-gray-900">{user.name}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>
            </button>

            <div className="invisible absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg group-hover:visible">
              <div className="border-b px-3 py-2">
                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
                <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 capitalize">
                  {user.role}
                </span>
              </div>
              <a
                href="/settings"
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Settings
              </a>
              <a
                href="/settings/sessions"
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Sessions
              </a>
              <hr className="my-1" />
              <button
                onClick={logout}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
```

- [ ] **Step 2: Update dashboard layout to include Header**

Replace `src/app/(dashboard)/layout.tsx`:

```tsx
// src/app/(dashboard)/layout.tsx
import { Header } from '@/components/layout/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <aside className="w-64 border-r border-gray-200 bg-white p-4">
          <nav className="space-y-1">
            <a
              href="/files"
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Files
            </a>
            <a
              href="/shared"
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Shared
            </a>
            <a
              href="/settings"
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Settings
            </a>
          </nav>
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update auth layout**

Replace `src/app/(auth)/layout.tsx`:

```tsx
// src/app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/header.tsx src/app/\(dashboard\)/layout.tsx src/app/\(auth\)/layout.tsx
git commit -m "feat: add session-aware header with avatar, dropdown, and role badge"
```

---

## Task 13: Session Management Page & tRPC Auth Router

**Files:**
- Modify: `src/server/trpc/routers/auth.ts`
- Create: `src/app/(dashboard)/settings/sessions/page.tsx`

**Interfaces:**
- Consumes: `protectedProcedure` from procedures, Better Auth session APIs

- [ ] **Step 1: Expand auth tRPC router**

```typescript
// src/server/trpc/routers/auth.ts
import { router, protectedProcedure } from '../procedures';
import { z } from 'zod';
import { db } from '@/server/db';

export const authRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    const { session } = ctx;
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      avatar: session.user.avatar,
      emailVerifiedAt: session.user.emailVerifiedAt,
    };
  }),

  sessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await db.session.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return sessions.map((s) => ({
      ...s,
      isCurrent: s.id === ctx.session.session.id,
    }));
  }),

  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.session.delete({
        where: {
          id: input.sessionId,
          userId: ctx.session.user.id,
        },
      });

      return { success: true };
    }),

  revokeAllSessions: protectedProcedure.mutation(async ({ ctx }) => {
    await db.session.deleteMany({
      where: {
        userId: ctx.session.user.id,
        id: { not: ctx.session.session.id },
      },
    });

    return { success: true };
  }),
});
```

- [ ] **Step 2: Create sessions page**

```tsx
// src/app/(dashboard)/settings/sessions/page.tsx
'use client';

import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';

export default function SessionsPage() {
  const { toast } = useToast();
  const { data: sessions, isLoading } = trpc.auth.sessions.useQuery();

  const revokeSession = trpc.auth.revokeSession.useMutation({
    onSuccess: () => {
      toast('Session revoked', 'success');
    },
    onError: () => {
      toast('Failed to revoke session', 'error');
    },
  });

  const revokeAll = trpc.auth.revokeAllSessions.useMutation({
    onSuccess: () => {
      toast('All other sessions revoked', 'success');
    },
  });

  if (isLoading) {
    return <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Active Sessions</h1>
        <button
          onClick={() => revokeAll.mutate()}
          disabled={revokeAll.isPending}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Revoke all others
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {sessions?.map((session) => (
          <div
            key={session.id}
            className="rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {session.userAgent ?? 'Unknown device'}
                  </span>
                  {session.isCurrent && (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  IP: {session.ipAddress ?? 'Unknown'} · Last active:{' '}
                  {new Date(session.updatedAt).toLocaleDateString()}
                </div>
              </div>
              {!session.isCurrent && (
                <button
                  onClick={() => revokeSession.mutate({ sessionId: session.id })}
                  disabled={revokeSession.isPending}
                  className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Revoke
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/server/trpc/routers/auth.ts src/app/\(dashboard\)/settings/
git commit -m "feat: add session management page with revoke individual/all sessions"
```

---

## Task 14: Playwright E2E Setup & Tests

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/auth.spec.ts`
- Modify: `package.json` (add test scripts)

**Interfaces:**
- Produces: E2E test suite for auth flows

- [ ] **Step 1: Create Playwright config**

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
```

- [ ] **Step 2: Create auth E2E tests**

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

const TEST_USER = {
  name: 'Test User',
  email: `test+${Date.now()}@example.com`,
  password: 'TestPass123!',
};

test.describe('Authentication flows', () => {
  test('registration flow', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[name="name"]', TEST_USER.name);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    await page.check('input[type="checkbox"][name="acceptTerms"]');

    await page.click('button[type="submit"]');

    // Should redirect to files or show verification banner
    await expect(page).toHaveURL(/\/files/);
  });

  test('login flow', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Should redirect to files
    await expect(page).toHaveURL(/\/files/);
  });

  test('unauthenticated user redirected to login', async ({ page }) => {
    await page.goto('/files');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('forgot password flow', async ({ page }) => {
    await page.goto('/forgot-password');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // Should show success message (even for non-existent emails)
    await expect(page.locator('text=If an account exists')).toBeVisible();
  });

  test('login shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'WrongPass123!');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('registration validates password requirements', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[name="name"]', 'Test');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');
    await page.check('input[type="checkbox"][name="acceptTerms"]');

    await page.click('button[type="submit"]');

    // Should show password validation errors
    await expect(page.locator('text=at least 8 characters')).toBeVisible();
  });

  test('registration validates password match', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[name="name"]', 'Test');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'StrongPass1!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPass1!');
    await page.check('input[type="checkbox"][name="acceptTerms"]');

    await page.click('button[type="submit"]');

    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('logout flow', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/files/);

    // Then logout via dropdown
    await page.click('button:has-text("Sign out")');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
```

- [ ] **Step 3: Add test scripts to package.json**

Add to `scripts` in `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Run existing Vitest tests to ensure nothing broke**

```bash
pnpm vitest run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts tests/e2e/ package.json
git commit -m "feat: add Playwright E2E tests for auth flows"
```

---

## Task 15: Final Integration — Build Check, Type Safety Audit, Commit

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: Everything from Tasks 1-14

- [ ] **Step 1: TypeScript check**

```bash
pnpm tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 2: ESLint check**

```bash
pnpm lint
```

Expected: No errors.

- [ ] **Step 3: Run all Vitest tests**

```bash
pnpm vitest run
```

Expected: All tests pass.

- [ ] **Step 4: Validate Prisma schema**

```bash
npx prisma validate
```

Expected: Schema valid.

- [ ] **Step 5: Run production build**

```bash
pnpm build
```

Expected: Build succeeds. Better Auth env var warnings expected.

- [ ] **Step 6: Audit for string role comparisons**

```bash
grep -rn "role === '" src/ --include="*.ts" --include="*.tsx" | grep -v "rbac/" | grep -v "__tests__/"
```

Expected: No matches (all role checks go through `can()`).

- [ ] **Step 7: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "chore: Phase 2 final integration check — all gates pass"
```

- [ ] **Step 8: Update progress ledger**

Update `.superpowers/sdd/progress.md` with Phase 2 completion status.

```bash
git add .superpowers/sdd/progress.md
git commit -m "docs: update progress ledger — Phase 2 auth system complete"
```

---

## Success Criteria

- [ ] Registration creates user + sends verification email
- [ ] Login works with remember me (30d vs 24h)
- [ ] Logout destroys session + redirects
- [ ] Forgot password flow end-to-end works
- [ ] Email verification flow end-to-end works
- [ ] All 8 roles have correct permissions
- [ ] `can(user).do(Permission.X)` — no direct string comparisons
- [ ] Middleware protects all private routes
- [ ] Admin routes require admin role level
- [ ] Audit log records all security events
- [ ] Unverified users blocked from sensitive operations
- [ ] Failed login lockout works (5 attempts → 15 min)
- [ ] Session management page shows active sessions
- [ ] All tests pass (unit + integration + E2E)
- [ ] TypeScript strict — zero errors
- [ ] ESLint clean
- [ ] Build passes
