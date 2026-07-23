# Phase 4: Admin Dashboard Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to execute this plan task-by-task.

**Goal:** Build admin panel — dashboard stats, user management, settings, languages, pages CMS.

**Prerequisites:** Phase 1-3 complete (auth, file manager all working).

**Tech Stack:** Next.js 16, TypeScript strict, Prisma 7, tRPC 11, shadcn/ui, TailwindCSS

---

### Task 1: Admin tRPC Router + Middleware

**Files:**
- Create: `src/server/trpc/routers/admin.ts`
- Modify: `src/server/trpc/root.ts` (merge admin router)
- Create: `src/middleware.ts` (admin route guard)

- [ ] Create admin router with: getDashboardStats, listUsers, getUser, updateUser, deleteUser, changeUserRole, changeStorageCapacity, getSettings, updateSettings
- [ ] Merge into app router
- [ ] Create Next.js middleware to protect /admin routes (redirect non-admins)

### Task 2: Admin Layout + Sidebar

**Files:**
- Create: `src/app/(dashboard)/admin/layout.tsx`
- Modify: `src/app/(dashboard)/layout.tsx` (add admin links conditionally)

- [ ] Create admin layout with nested sidebar
- [ ] Add admin links to main sidebar (visible only for ADMIN+ role)

### Task 3: Dashboard Overview

**Files:**
- Create: `src/app/(dashboard)/admin/page.tsx`
- Create: `src/components/admin/StatsCards.tsx`

- [ ] Create dashboard page with stats cards (users, subscriptions, storage, files)
- [ ] Add registration chart placeholder
- [ ] Add recent activity list

### Task 4: User Management

**Files:**
- Create: `src/app/(dashboard)/admin/users/page.tsx`
- Create: `src/app/(dashboard)/admin/users/[id]/page.tsx`
- Create: `src/components/admin/UserTable.tsx`
- Create: `src/components/admin/UserDetail.tsx`

- [ ] Create user list with search, sort, pagination
- [ ] Create user detail with role change, storage change, delete

### Task 5: Site Settings

**Files:**
- Create: `src/app/(dashboard)/admin/settings/page.tsx`
- Create: `src/components/admin/SettingsForm.tsx`

- [ ] Create settings form (app name, URL, language, Stripe config)
- [ ] Wire to admin.updateSettings mutation

### Task 6: Language Management

**Files:**
- Create: `src/app/(dashboard)/admin/languages/page.tsx`
- Create: `src/components/admin/LanguageManager.tsx`
- Modify: `src/server/trpc/routers/admin.ts` (add language procedures)

- [ ] Add language CRUD procedures
- [ ] Create language list with add/delete
- [ ] Create translation editor

### Task 7: Pages CMS

**Files:**
- Create: `src/app/(dashboard)/admin/pages/page.tsx`
- Create: `src/components/admin/PageEditor.tsx`
- Modify: `src/server/trpc/routers/admin.ts` (add page procedures)

- [ ] Add page procedures (list, get, update)
- [ ] Create page list
- [ ] Create page editor with title, slug, content, visibility

### Task 8: Final Integration

- [ ] TypeScript check, all tests pass
- [ ] Update progress ledger
