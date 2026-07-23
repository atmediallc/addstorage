# Phase 5: User Account Settings Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to execute this plan task-by-task.

**Goal:** Build user account settings — profile editing, password change, storage details.

**Prerequisites:** Phase 1-4 complete.

**Tech Stack:** Next.js 16, TypeScript strict, Prisma 7, tRPC 11, shadcn/ui, TailwindCSS

---

### Task 1: User tRPC Router

**Files:**
- Create: `src/server/trpc/routers/user.ts`
- Modify: `src/server/trpc/root.ts` (merge user router)

- [ ] Create user router with: getProfile, updateProfile, changePassword, uploadAvatar, getStorageDetails
- [ ] Merge into app router

### Task 2: Profile Settings Page

**Files:**
- Create: `src/app/(dashboard)/settings/page.tsx`
- Create: `src/components/settings/ProfileForm.tsx`

- [ ] Create profile page with name, email, avatar
- [ ] Inline editing for name
- [ ] Avatar upload with preview

### Task 3: Password Change

**Files:**
- Create: `src/app/(dashboard)/settings/password/page.tsx`
- Create: `src/components/settings/PasswordForm.tsx`

- [ ] Create password change form
- [ ] Current password + new password + confirm
- [ ] Validation: min 8 chars, uppercase, lowercase, number, special char

### Task 4: Storage Details

**Files:**
- Create: `src/components/settings/StorageDetails.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx` (add storage card)

- [ ] Create storage usage card with progress bar
- [ ] Show breakdown by file type

### Task 5: Final Integration

- [ ] TypeScript check, all tests pass
- [ ] Update progress ledger
