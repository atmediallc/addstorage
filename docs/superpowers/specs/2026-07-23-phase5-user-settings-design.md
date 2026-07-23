# Phase 5: User Account Settings Design

> **Scope:** User profile management — edit name, email, avatar, password, timezone. View storage usage and invoices.

---

## 1. Architecture

### Route Structure

```
/settings              → Profile overview + edit
/settings/password     → Change password
/settings/billing      → Invoices & payment methods (Phase 6)
```

### tRPC Router

```
src/server/trpc/routers/user.ts:
  getProfile            (protectedProcedure)
  updateProfile         (protectedProcedure)
  changePassword        (protectedProcedure)
  uploadAvatar          (protectedProcedure)
  getStorageDetails     (protectedProcedure)
```

---

## 2. Profile Management

### Profile Page

- Display current name, email, avatar
- Edit name inline (click to edit)
- Edit email with verification
- Upload avatar (drag-drop or click)
- Timezone selector

### Operations

- **Update name:** `user.updateProfile({ name })`
- **Update email:** `user.updateProfile({ email })` — triggers re-verification
- **Upload avatar:** `user.uploadAvatar({ file })` — uploads to S3, updates user.avatar
- **Change password:** `user.changePassword({ currentPassword, newPassword })`

---

## 3. Storage Details

### Storage Card

- Total capacity (from user_settings.storageCapacity)
- Used space (computed from file sizes)
- Progress bar with color coding
- Breakdown: files by type (images, documents, videos, other)

---

## 4. File Structure

```
tutiscloud/
├── src/
│   ├── server/
│   │   └── trpc/
│   │       └── routers/
│   │           └── user.ts              # NEW — user settings router
│   ├── app/
│   │   └── (dashboard)/
│   │       └── settings/
│   │           ├── page.tsx             # NEW — profile settings
│   │           └── password/
│   │               └── page.tsx         # NEW — change password
│   └── components/
│       └── settings/
│           ├── ProfileForm.tsx          # NEW — name/email/avatar edit
│           ├── PasswordForm.tsx         # NEW — password change form
│           └── StorageDetails.tsx       # NEW — storage usage card
```
