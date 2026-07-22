# Phase 2: Enterprise Auth System Design

> **Scope:** Complete authentication, authorization, RBAC, session management, audit logging, and production-ready UI for TutisCloud. This is the permanent auth foundation of the platform.

---

## 1. RBAC Architecture

### File Structure

```
src/server/auth/
  rbac/
    roles.ts        — 8 roles with hierarchy levels
    permissions.ts  — typed permission constants
    ability.ts      — can(user).do('action', 'resource') checker
    index.ts        — re-exports
```

### Role Hierarchy

Level determines inheritance — higher level inherits all lower level permissions.

| Role       | Level | Description                              |
|------------|-------|------------------------------------------|
| MASTER     | 100   | Account owner, billing, everything       |
| ADMIN      | 80    | Manage users + settings, no billing      |
| MANAGER    | 60    | Team management, reports, no user admin  |
| EDITOR     | 40    | Upload, edit, delete files + folders     |
| SUPPORT    | 30    | View users, view files, help desk        |
| ACCOUNTANT | 20    | View billing, invoices, reports          |
| USER       | 10    | Standard: own files, shares              |
| VIEWER     | 0     | Read-only on shared folders              |

### Permissions (compile-time constants, no DB table)

```typescript
// src/server/auth/rbac/permissions.ts
enum Permission {
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
```

### Role → Permission Mapping

```typescript
// src/server/auth/rbac/roles.ts
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  master: Object.values(Permission), // all permissions
  admin: [
    Permission.USER_CREATE, Permission.USER_READ, Permission.USER_UPDATE,
    Permission.USER_DELETE, Permission.USER_LIST,
    Permission.ROLE_ASSIGN, Permission.ROLE_LIST,
    Permission.FILE_CREATE, Permission.FILE_READ, Permission.FILE_UPDATE,
    Permission.FILE_DELETE, Permission.FILE_SHARE, Permission.FILE_DOWNLOAD,
    Permission.FOLDER_CREATE, Permission.FOLDER_READ, Permission.FOLDER_UPDATE,
    Permission.FOLDER_DELETE,
    Permission.SHARE_CREATE, Permission.SHARE_READ, Permission.SHARE_UPDATE,
    Permission.SHARE_DELETE,
    Permission.ADMIN_PANEL, Permission.SYSTEM_SETTINGS, Permission.AUDIT_READ,
  ],
  manager: [
    Permission.USER_READ, Permission.USER_LIST,
    Permission.FILE_CREATE, Permission.FILE_READ, Permission.FILE_UPDATE,
    Permission.FILE_DELETE, Permission.FILE_SHARE, Permission.FILE_DOWNLOAD,
    Permission.FOLDER_CREATE, Permission.FOLDER_READ, Permission.FOLDER_UPDATE,
    Permission.FOLDER_DELETE,
    Permission.SHARE_CREATE, Permission.SHARE_READ, Permission.SHARE_UPDATE,
    Permission.SHARE_DELETE,
    Permission.AUDIT_READ,
  ],
  editor: [
    Permission.FILE_CREATE, Permission.FILE_READ, Permission.FILE_UPDATE,
    Permission.FILE_DELETE, Permission.FILE_SHARE, Permission.FILE_DOWNLOAD,
    Permission.FOLDER_CREATE, Permission.FOLDER_READ, Permission.FOLDER_UPDATE,
    Permission.FOLDER_DELETE,
    Permission.SHARE_CREATE, Permission.SHARE_READ,
  ],
  support: [
    Permission.USER_READ, Permission.USER_LIST,
    Permission.FILE_READ, Permission.FOLDER_READ, Permission.SHARE_READ,
    Permission.AUDIT_READ,
  ],
  accountant: [
    Permission.BILLING_VIEW,
    Permission.USER_READ, Permission.USER_LIST,
    Permission.AUDIT_READ,
  ],
  user: [
    Permission.FILE_CREATE, Permission.FILE_READ, Permission.FILE_UPDATE,
    Permission.FILE_DELETE, Permission.FILE_SHARE, Permission.FILE_DOWNLOAD,
    Permission.FOLDER_CREATE, Permission.FOLDER_READ,
    Permission.SHARE_CREATE, Permission.SHARE_READ,
  ],
  viewer: [
    Permission.FILE_READ, Permission.FOLDER_READ,
  ],
};

const ROLE_LEVELS: Record<string, number> = {
  master: 100,
  admin: 80,
  manager: 60,
  editor: 40,
  support: 30,
  accountant: 20,
  user: 10,
  viewer: 0,
};
```

### Ability Checker

```typescript
// src/server/auth/rbac/ability.ts
function can(user: { role: string }) {
  return {
    do: (action: Permission): boolean => {
      return ROLE_PERMISSIONS[user.role]?.includes(action) ?? false;
    },
    atLeast: (role: string): boolean => {
      return (ROLE_LEVELS[user.role] ?? 0) >= (ROLE_LEVELS[role] ?? 0);
    },
  };
}
```

No direct string comparisons anywhere in the codebase. Always `can(user).do(Permission.X)` or `can(user).atLeast('admin')`.

---

## 2. Auth Flows

### Registration

- **Page:** `/register`
- **Form:** name, email, password, confirm password, terms acceptance checkbox
- **Validation:** Zod schema — strong password (8+ chars, uppercase, lowercase, number, special char)
- **Flow:** Better Auth `signUp.email()` → creates user + session → redirect to `/files`
- **Email verification:** Resend sends verification email on signup
- **Unverified users:** Can browse but see persistent banner. Cannot create shares or download zips.

### Login

- **Page:** `/login`
- **Form:** email, password, "Remember Me" checkbox
- **Flow:** Better Auth `signIn.email()` → session created → redirect to `/files` or `callbackUrl`
- **Remember Me:** 30-day session without, 24-hour without
- **Error handling:** Generic "Invalid email or password" (no user enumeration)
- **Rate limiting:** 5 failed attempts → 15-minute lockout (tracked via `failedLoginAttempts` + `lockedUntil` on User model)

### Logout

- **Trigger:** Button in header dropdown
- **Flow:** Better Auth `signOut()` → destroys session → invalidates cookies → redirect to `/login`
- **Cache:** `queryClient.resetQueries()` to clear client state

---

## 3. Password Reset & Email Verification

### Forgot Password

1. User visits `/forgot-password`, enters email
2. Better Auth `forgetPassword()` → generates secure token, stores hash in DB
3. Resend sends email with reset link: `/reset-password?token=xxx&email=xxx`
4. Tokens expire after 1 hour, single-use
5. No user enumeration: "If an account exists, an email was sent"

### Reset Password

1. User clicks link → visits `/reset-password`
2. Form: new password + confirm password
3. Better Auth `resetPassword()` → updates password → invalidates ALL existing sessions
4. Redirect to `/login` with success toast

### Email Verification

1. On registration, Better Auth `sendVerificationEmail()` sends token via Resend
2. Verification link: `/api/auth/verify-email?token=xxx` → marks `emailVerifiedAt`
3. Unverified users: persistent yellow banner with "Verify your email" + resend button
4. `verifiedProcedure` in tRPC blocks unverified users from: creating shares, downloading zips

---

## 4. Session Management & Middleware

### Session Management

- Better Auth handles sessions with secure HTTP-only cookies
- Session metadata: IP address, user agent, created/updated timestamps
- `/settings/sessions` page: list active sessions with device info
- "Revoke this session" per session, "Revoke all other sessions" button
- Session refresh: Better Auth `updateAge` = 24h sliding window
- Session expiry per role: master 90 days, admin 30 days, others 7 days
- Max concurrent sessions: master/admin = 3, others = 1

### Middleware (Next.js middleware.ts)

Middleware does only fast redirect checks — no heavy logic:

```
Route Protection:
  /login, /register, /forgot-password, /reset-password  → public only
    (redirect to /files if already logged in)
  /files, /shared, /settings, /profile                   → authenticated
    (redirect to /login?callbackUrl=... if no session)
  /admin/*                                                → admin role+ (level >= 80)
    (redirect to /files if insufficient role)
  /api/trpc/*                                             → handled by tRPC procedures
```

Flow:
1. Read session from Better Auth cookie
2. Protected route + no session → redirect to `/login?callbackUrl=...`
3. Public-only route + session → redirect to `/files`
4. Admin route + insufficient role level → redirect to `/files`

Actual permission checks happen in tRPC procedures, not middleware.

---

## 5. Prisma Schema Extensions & Audit Log

### New User Fields

```prisma
model User {
  // ... existing fields preserved ...
  lastLoginAt         DateTime?    @map("last_login_at")
  lastActivityAt      DateTime?    @map("last_activity_at")
  failedLoginAttempts Int           @default(0) @map("failed_login_attempts")
  lockedUntil         DateTime?     @map("locked_until")
  passwordChangedAt   DateTime?     @map("password_changed_at")
  deletedAt           DateTime?     @map("deleted_at")
  timezone            String?
  locale              String?
  twoFactorEnabled    Boolean       @default(false) @map("two_factor_enabled")
}
```

### AuditLog Model

```prisma
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

### Tracked Events

| Event                        | Description                          |
|------------------------------|--------------------------------------|
| `auth.register`              | User created                         |
| `auth.login`                 | Successful login                     |
| `auth.login.failed`          | Failed attempt (email only, no userId) |
| `auth.logout`                | Session destroyed                    |
| `auth.logout.all`            | All sessions revoked                 |
| `auth.password.change`       | Password updated                     |
| `auth.password.reset.requested` | Reset email sent                  |
| `auth.password.reset.completed` | Password reset done               |
| `auth.email.verified`        | Email verified                       |
| `auth.role.changed`          | Role changed (metadata: old/new)     |
| `auth.session.revoked`       | Single session revoked               |

### Audit Service

A `logAuditEvent(userId, action, resource?, resourceId?, metadata?)` utility function called from tRPC procedures and auth handlers. Writes directly to `audit_logs` table.

---

## 6. UI, Header, & Folder Organization

### Auth Pages (under `(auth)` route group)

- `/login` — email, password, remember me, forgot password link, register link
- `/register` — name, email, password, confirm password, terms, login link
- `/forgot-password` — email input, submit, success message
- `/reset-password` — new password + confirm (token in URL params)
- `/verify-email` — auto-verify on link click, success/error state

### Header (`src/components/layout/header.tsx`)

- App name/logo on left
- Right side: avatar (or initials fallback), dropdown with name/email/role badge
- Dropdown links: Profile, Settings, Sessions, Logout
- Mobile: hamburger menu with same options
- Unverified: persistent yellow banner below header with verify button

### Dashboard Layout Update

- Wrap children with Header component
- Sidebar navigation session-aware (show/hide admin links based on role level)

### Folder Organization

```
src/
  server/auth/
    rbac/              — roles, permissions, ability checker
    audit.ts           — logAuditEvent utility
  app/(auth)/
    login/page.tsx
    register/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
    verify-email/page.tsx
    layout.tsx
  app/(dashboard)/
    layout.tsx
  components/
    layout/
      header.tsx
    auth/
      login-form.tsx
      register-form.tsx
      forgot-password-form.tsx
      reset-password-form.tsx
      unverified-banner.tsx
      auth-guard.tsx
  hooks/
    use-auth.ts         — useSession + role helpers
    use-permissions.ts  — can(user).do() for client
  lib/
    email/
      resend.ts         — Resend client config
      templates/
        verification.tsx
        reset-password.tsx
  server/trpc/
    procedures.ts       — all procedure definitions (protected, verified, role, permission, etc.)
  middleware.ts         — Next.js route protection
```

---

## 7. tRPC Procedures & Email Config

### Procedure Architecture

```typescript
// src/server/trpc/procedures.ts
publicProcedure           // no auth
protectedProcedure        // session exists
verifiedProcedure         // session + emailVerifiedAt
roleProcedure(role)       // session + role level check
permissionProcedure(perm) // session + permission check
masterProcedure           // roleProcedure('master')
adminProcedure            // roleProcedure('admin')
managerProcedure          // roleProcedure('manager')
```

Composable: any procedure can chain `.use()` for additional checks.

### Resend + Better Auth Email Config

```typescript
// In betterAuth() config:
emailVerification: {
  sendOnSignUp: true,
  expiresIn: 3600,
},
sendVerificationEmail: async ({ user, token, url }) => {
  await resend.emails.send({
    from: 'TutisCloud <noreply@tutiscloud.com>',
    to: user.email,
    subject: 'Verify your email',
    html: render(verificationEmailTemplate({ url, userName: user.name })),
  });
},
forgotPassword: {
  sendResetEmail: async ({ user, token, url }) => {
    await resend.emails.send({
      from: 'TutisCloud <noreply@tutiscloud.com>',
      to: user.email,
      subject: 'Reset your password',
      html: render(resetPasswordEmailTemplate({ url, userName: user.name })),
    });
  },
  expiresIn: 3600,
},
```

### New Dependencies

- `resend` — email sending
- `@react-email/render` — HTML email templates
- `playwright` + `@playwright/test` — E2E tests
- `react-hook-form` + `@hookform/resolvers` — form handling

---

## 8. Security (OWASP)

- **Rate limiting:** 5 failed login attempts → 15 min lockout (tracked on User model)
- **Secure cookies:** HTTP-only, Secure, SameSite=Lax (Better Auth default)
- **Input validation:** Zod schemas on every form and tRPC procedure
- **Password hashing:** Better Auth handles bcrypt (12 rounds)
- **Session rotation:** On login and privilege change
- **Email verification:** Required for sensitive operations
- **Role escalation prevention:** `roleProcedure` checks level hierarchy, not just exact match
- **Permission escalation prevention:** Permissions are compile-time constants, not user-configurable
- **Timing-safe comparisons:** Token validation uses Better Auth's built-in
- **No user enumeration:** Generic error messages on login/forgot-password
- **Soft delete:** Users deleted via `deletedAt`, not hard delete
- **Audit trail:** Every security event logged with IP + user agent

---

## 9. Testing Strategy

### Unit Tests (Vitest)

- RBAC: role hierarchy, permission checks, ability builder
- Validators: Zod schemas for all forms
- Audit: logAuditEvent writes correctly
- Utils: token generation, format helpers

### Integration Tests (Vitest)

- Auth flows: registration → session created, login → session, logout → session destroyed
- Password reset: request → token valid → password changed → old sessions invalid
- Email verification: unverified blocked, verified allowed
- RBAC: role-based access to tRPC procedures

### E2E Tests (Playwright)

- Registration flow: fill form → submit → redirect → dashboard
- Login flow: fill form → submit → redirect to files
- Logout: click logout → session gone → redirect to login
- Forgot password: submit email → check console for link → visit reset page → new password → login
- Email verification: register → click link → verified state
- Unauthorized access: visit /admin as viewer → redirected
- Session expiry: wait → session gone → redirect

---

## 10. Success Criteria

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
