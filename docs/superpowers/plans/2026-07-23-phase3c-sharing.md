# Phase 3C: Sharing System Implementation Plan

**Goal:** Implement share links — create, manage, view public shares, permissions.

**Prerequisites:** Phase 3A + 3B complete.

---

### Task 1: Share Procedures + ShareDialog

**Files:**
- Modify: `src/server/trpc/routers/files.ts` (add share procedures)
- Create: `src/components/file-manager/ShareDialog.tsx`
- Modify: `src/components/file-manager/ItemContextMenu.tsx` (add Share option)

- [ ] Add share procedures: createShare, listShares, deleteShare, updateShare, getShareContent, getShareDownloadUrl
- [ ] Create ShareDialog with permission, password, expiration settings
- [ ] Add Share to context menu

### Task 2: Public Share Page

**Files:**
- Create: `src/app/s/[token]/page.tsx`
- Create: `src/components/file-manager/ShareView.tsx`

- [ ] Create public share page accessible without auth
- [ ] Handle password-protected, expired, and revoked shares

### Task 3: Final Integration

- [ ] TypeScript check, tests pass, commit
