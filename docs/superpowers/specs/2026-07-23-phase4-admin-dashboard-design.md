# Phase 4: Admin Dashboard Design

> **Scope:** Admin panel for user management, site settings, language/i18n, pages CMS, and system overview. Requires MASTER or ADMIN role.

---

## 1. Architecture

### Route Structure

```
/admin                  → Dashboard overview (stats, charts)
/admin/users            → User list with search, sort, pagination
/admin/users/[id]       → User detail (profile, storage, subscription, files)
/admin/settings         → Site settings (name, logo, currency, Stripe config)
/admin/languages        → Language management (CRUD, translations)
/admin/pages            → Pages CMS (static pages: pricing, terms, etc.)
```

### RBAC Gate

All `/admin/*` routes protected by middleware checking `role.level >= 80` (ADMIN+).

### tRPC Router

```
src/server/trpc/routers/admin.ts:
  getDashboardStats    (protectedProcedure — ADMIN+)
  listUsers            (protectedProcedure — ADMIN+)
  getUser              (protectedProcedure — ADMIN+)
  updateUser           (protectedProcedure — ADMIN+)
  deleteUser           (protectedProcedure — ADMIN+)
  changeUserRole       (protectedProcedure — ADMIN+)
  changeStorageCapacity(protectedProcedure — ADMIN+)
  getSettings          (protectedProcedure — ADMIN+)
  updateSettings       (protectedProcedure — ADMIN+)
  listLanguages        (protectedProcedure — ADMIN+)
  createLanguage       (protectedProcedure — ADMIN+)
  updateLanguage       (protectedProcedure — ADMIN+)
  deleteLanguage       (protectedProcedure — ADMIN+)
  updateTranslation    (protectedProcedure — ADMIN+)
  listPages            (protectedProcedure — ADMIN+)
  getPage              (protectedProcedure — ADMIN+)
  updatePage           (protectedProcedure — ADMIN+)
```

---

## 2. Dashboard Overview

### Stats Cards

| Card | Source | Description |
|------|--------|-------------|
| Total Users | `User.count()` | All registered users |
| Active Subscriptions | `Subscription.count()` | Stripe active subs |
| Storage Used | `SUM(FileManagerFile.filesize)` | Total bytes across all users |
| Files Count | `FileManagerFile.count()` | Total files in system |

### Charts

- **Registrations over time** — last 30 days, grouped by day
- **Storage usage top 10** — bar chart of users by storage

### Recent Activity

- Last 10 registrations
- Last 10 uploads

---

## 3. User Management

### User List

- Table: avatar, name, email, role, storage used, created_at
- Search by name/email
- Sort by any column
- Pagination (10 per page)
- Actions: View, Edit Role, Delete

### User Detail

- Profile info (name, email, avatar)
- Role selector (dropdown)
- Storage capacity (number input, GB)
- Storage usage bar
- Files/folders count
- Subscription status (if any)
- Activity log (last 10 actions)

### Operations

- **Change role:** `admin.changeUserRole({ userId, role })` — validates hierarchy (can't assign higher role than own)
- **Change storage:** `admin.changeStorageCapacity({ userId, capacity })` — in GB
- **Delete user:** `admin.deleteUser({ userId })` — cascades: delete files from S3, folders, shares, favourites, settings, then user
- **Create user:** `admin.createUser({ name, email, password, role })` — creates with Better Auth

---

## 4. Site Settings

### Settings Key-Value Store

Uses existing `Setting` model (name/value pairs).

### Editable Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `app_name` | string | TutisCloud | Site name |
| `app_url` | string | http://localhost:3000 | App URL |
| `language` | string | en | Default language |
| `currency` | string | USD | Billing currency |
| `stripe_key` | string | | Stripe publishable key |
| `stripe_secret` | string | | Stripe secret key |
| `stripe_webhook_secret` | string | | Stripe webhook secret |

### UI

- Form with fields for each setting
- Save button → `admin.updateSettings({ settings: { key: value, ... } })`
- Stripe connection test button

---

## 5. Language Management

### Language CRUD

- List: locale code, name, translation count
- Create: name + locale (e.g., "Spanish" + "es")
- Delete: prevents deleting default language

### Translation Editor

- Table: key, value (editable)
- Search/filter by key
- Save individual or bulk save
- Uses `LanguageTranslation` model

---

## 6. Pages CMS

### Page List

- Table: title, slug, visibility (published/draft), updated_at
- Actions: Edit

### Page Editor

- Title input
- Slug (auto-generated from title, editable)
- Visibility toggle (published/draft)
- Content: textarea (supports markdown or HTML)
- Save → `admin.updatePage({ slug, title, content, visibility })`

---

## 7. Middleware

### Admin Gate

```typescript
// src/server/trpc/middleware/admin.ts
import { protectedProcedure } from '../procedures';
import { TRPCError } from '@trpc/server';

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = ctx.session.user;
  // Check role level >= 80 (ADMIN)
  if (user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});
```

---

## 8. UI Components

### Layout

Admin pages use the existing dashboard layout with sidebar. Admin-only links shown only for ADMIN+ roles.

### Sidebar Updates

```
Files
Favourites
Shared
Trash
──── Admin ──── (only for ADMIN+)
  Dashboard
  Users
  Settings
  Languages
  Pages
Settings
```

---

## 9. File Structure

```
tutiscloud/
├── src/
│   ├── server/
│   │   └── trpc/
│   │       ├── routers/
│   │       │   └── admin.ts              # NEW — admin tRPC router
│   │       └── root.ts                   # MODIFY — merge admin router
│   ├── middleware/
│   │   └── admin.ts                      # MODIFY — check admin role
│   ├── app/
│   │   └── (dashboard)/
│   │       └── admin/
│   │           ├── layout.tsx            # NEW — admin layout with sidebar
│   │           ├── page.tsx              # NEW — dashboard overview
│   │           ├── users/
│   │           │   ├── page.tsx          # NEW — user list
│   │           │   └── [id]/
│   │           │       └── page.tsx      # NEW — user detail
│   │           ├── settings/
│   │           │   └── page.tsx          # NEW — site settings
│   │           ├── languages/
│   │           │   └── page.tsx          # NEW — language management
│   │           └── pages/
│   │               └── page.tsx          # NEW — pages CMS
│   └── components/
│       └── admin/
│           ├── StatsCards.tsx            # NEW — dashboard stat cards
│           ├── UserTable.tsx             # NEW — user list table
│           ├── UserDetail.tsx            # NEW — user detail view
│           ├── SettingsForm.tsx          # NEW — settings form
│           ├── LanguageManager.tsx       # NEW — language CRUD + translations
│           └── PageEditor.tsx            # NEW — page editor
```
