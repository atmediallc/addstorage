# TutisCloud: Laravel → Next.js Enterprise Migration Design

## 1. Executive Summary

Migrate TutisCloud — a cloud file storage SaaS (self-hosted Dropbox/Google Drive clone) — from Laravel 6 + Vue.js 2 to Next.js 14 + TypeScript + PostgreSQL + Prisma + tRPC.

**Approach:** Full scaffold + all schemas first, then feature-by-feature implementation across 8 phases.

**Key decisions:**
- API: tRPC (type-safe RPC, replaces Laravel REST endpoints)
- Frontend: Unified Next.js App Router (SPA-style file manager within Next.js)
- DB: PostgreSQL with Prisma ORM (all 12+ models migrated)
- Auth: Better Auth (replaces Laravel Passport + cookie auth)
- Payments: Stripe SDK directly (replaces Cartalyst/Stripe + Cashier)
- File Storage: S3-compatible via AWS SDK (replaces Laravel Storage facade)
- Background Jobs: BullMQ with Redis (replaces Laravel queues)
- Search: PostgreSQL full-text search (replaces TNTSearch/Laravel Scout)

---

## 2. Application Overview

TutisCloud is a cloud file management platform with:

- **File Management:** Hierarchical folders/files, upload, rename, move, delete, zip, favourites, trash
- **Sharing:** Public/private share links with tokens, expiration, password protection
- **Subscriptions:** Stripe + Braintree billing, plans, invoices, payment methods
- **Admin Panel:** Dashboard, user management, plans, invoices, pages CMS, language management
- **Localization:** DB-stored translations, multiple languages
- **Public Pages:** Pricing, shared file access, support contact

### Models (12)
| Model | Table | Description |
|-------|-------|-------------|
| User | users | Auth, roles, Stripe customer |
| FileManagerFile | file_manager_files | Files with metadata |
| FileManagerFolder | file_manager_folders | Hierarchical folders |
| Share | shares | Share links/tokens |
| Setting | settings | App config (name/value) |
| Page | pages | CMS pages |
| UserSettings | user_settings | Per-user preferences + billing |
| PaymentGateway | payment_gateways | Gateway config |
| Language | languages | Language definitions |
| LanguageString | language_strings | Translation strings |
| Traffic | traffic | Upload traffic tracking |
| Zip | zips | Zip download tracking |
| FavouriteFolder | favourite_folders | User favourited folders |

### Controllers (21)
| Group | Controllers |
|-------|------------|
| Admin | DashboardController, InvoiceController, LanguageController, PagesController, PlanController, UserController |
| Auth | AuthController, ConfirmPasswordController, ForgotPasswordController, LoginController, RegisterController, ResetPasswordController, VerificationController |
| FileOps | BrowseController, EditItemsController, FavouriteController, ShareController, TrashController |
| Sharing | FileSharingController |
| User | AccountController, PaymentMethodsController, SubscriptionController |
| General | PricingController, SetupWizardController, UpgradeAppController |
| Other | AppFunctionsController, SettingController, WebhookController, DeployController, FileAccessController |

---

## 3. Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Users & Auth ───────────────────────────────────────────────

model User {
  id              Int       @id @default(autoincrement())
  name            String
  email           String    @unique
  emailVerifiedAt DateTime? @map("email_verified_at")
  password        String
  avatar          String?
  rememberToken   String?   @map("remember_token")

  // Stripe columns (from cashier migration)
  stripeId        String?   @unique @map("stripe_id")
  cardBrand       String?   @map("card_brand")
  cardLastFour    String?   @map("card_last_four", 4)
  trialEndsAt     DateTime? @map("trial_ends_at")

  // Role (admin migration)
  role            String    @default("master") // master | editor | viewer

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  // Relations
  files                 FileManagerFile[]
  filesWithTrashed      FileManagerFile[] @relation("FilesWithTrashed")
  folders               FileManagerFolder[]
  foldersWithTrashed    FileManagerFolder[] @relation("FoldersWithTrashed")
  settings              UserSettings?
  favourites            FavouriteFolder[]
  shares                Share[]
  subscriptions         Subscription[]
  traffic               Traffic[]
  zips                  Zip[]

  @@map("users")
}

model PasswordReset {
  email     String   @db.VarChar(255)
  token     String   @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at")

  @@id([email, token])
  @@map("password_resets")
}

// ─── File Manager ───────────────────────────────────────────────

model FileManagerFolder {
  id          Int       @id @default(autoincrement())
  uniqueId    Int       @unique @map("unique_id")
  parentId    Int       @default(0) @map("parent_id")
  name        String?
  type        String?

  // User scoping
  userId      Int?      @map("user_id")
  userScope   String    @default("master") @map("user_scope") // master | editor | viewer

  // Folder customization (actual migration: icon_color + icon_emoji)
  iconColor   String?   @map("icon_color")
  iconEmoji   String?   @map("icon_emoji")

  deletedAt   DateTime? @map("deleted_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  // Relations
  user            User?               @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent          FileManagerFolder?  @relation("FolderTree", fields: [parentId], references: [uniqueId])
  children        FileManagerFolder[]  @relation("FolderTree")
  files           FileManagerFile[]
  favourites      FavouriteFolder[]
  shares          Share[]

  @@index([userId])
  @@index([parentId])
  @@index([uniqueId])
  @@map("file_manager_folders")
}

model FileManagerFile {
  id          Int       @id @default(autoincrement())
  uniqueId    Int       @unique @map("unique_id")
  folderId    Int       @default(0) @map("folder_id")
  thumbnail   String?
  name        String?
  basename    String?
  mimetype    String?
  filesize    String?
  type        String?

  // User scoping
  userId      Int?      @map("user_id")
  userScope   String    @default("master") @map("user_scope") // master | editor | viewer

  // Metadata (actual migration: single metadata longText column, not separate exif columns)
  metadata    String?   @db.LongText @map("metadata")

  deletedAt   DateTime? @map("deleted_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  // Relations
  user    User?              @relation(fields: [userId], references: [id], onDelete: Cascade)
  folder  FileManagerFolder? @relation(fields: [folderId], references: [uniqueId])
  shares  Share[]

  @@index([userId])
  @@index([folderId])
  @@index([uniqueId])
  @@map("file_manager_files")
}

// ─── Sharing ────────────────────────────────────────────────────

model Share {
  id          Int       @id @default(autoincrement())
  userId      Int       @map("user_id")
  token       String    @unique @db.VarChar(16)
  itemId      Int       @map("item_id")
  type        String    // file | files | folder
  permission  String?   // visitor | editor
  protected   Boolean   @default(false)
  password    String?
  expireIn    Int?      @map("expire_in") // days until expiration

  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  // Relations
  user       User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  file       FileManagerFile?  @relation(fields: [itemId], references: [uniqueId])
  folder     FileManagerFolder? @relation(fields: [itemId], references: [uniqueId])

  @@index([userId])
  @@index([token])
  @@index([itemId])
  @@map("shares")
}

// ─── Subscriptions (Stripe Cashier) ─────────────────────────────

model Subscription {
  id            Int       @id @default(autoincrement())
  userId        Int       @map("user_id")
  name          String
  stripeId      String    @map("stripe_id")
  stripeStatus  String    @map("stripe_status")
  stripePlan    String?   @map("stripe_plan")
  quantity      Int?
  trialEndsAt   DateTime? @map("trial_ends_at")
  endsAt        DateTime? @map("ends_at")

  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // Relations
  user  User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  items SubscriptionItem[]

  @@index([userId, stripeStatus])
  @@map("subscriptions")
}

model SubscriptionItem {
  id              Int    @id @default(autoincrement())
  subscriptionId  Int    @map("subscription_id")
  stripeId        String @map("stripe_id")
  stripePlan      String @map("stripe_plan")
  quantity        Int

  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  // Relations
  subscription Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@unique([subscriptionId, stripePlan])
  @@map("subscription_items")
}

// ─── User Settings ──────────────────────────────────────────────

model UserSettings {
  id               Int     @id @default(autoincrement())
  userId           Int     @unique @map("user_id")
  storageCapacity  Int     @default(0) @map("storage_capacity") // bytes
  billingName      String? @map("billing_name")
  billingAddress   String? @map("billing_address")
  billingState     String? @map("billing_state")
  billingCity      String? @map("billing_city")
  billingPostalCode String? @map("billing_postal_code")
  billingCountry   String? @map("billing_country")
  billingPhoneNumber String? @map("billing_phone_number")
  timezone         String?

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_settings")
}

// ─── App Settings ───────────────────────────────────────────────

model Setting {
  id    Int    @id @default(autoincrement())
  name  String @unique
  value String?

  @@map("settings")
}

// ─── CMS Pages ──────────────────────────────────────────────────

model Page {
  id        Int      @id @default(autoincrement())
  title     String?
  slug      String?  @unique
  body      String?
  status    String?  // published | draft
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("pages")
}

// ─── Payment Gateways ──────────────────────────────────────────

model PaymentGateway {
  id        Int      @id @default(autoincrement())
  name      String?
  slug      String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("payment_gateways")
}

// ─── Localization ───────────────────────────────────────────────

model Language {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  strings LanguageString[]

  @@map("languages")
}

model LanguageString {
  id           Int      @id @default(autoincrement())
  languageId   Int      @map("language_id")
  string       String?
  translation  String?

  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  language Language @relation(fields: [languageId], references: [id], onDelete: Cascade)

  @@index([languageId])
  @@map("language_strings")
}

// ─── Favourites ─────────────────────────────────────────────────

model FavouriteFolder {
  id             Int      @id @default(autoincrement())
  userId         Int      @map("user_id")
  folderUniqueId Int      @map("folder_unique_id")

  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  // Relations
  user   User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  folder FileManagerFolder @relation(fields: [folderUniqueId], references: [uniqueId], onDelete: Cascade)

  @@unique([userId, folderUniqueId])
  @@map("favourite_folders")
}

// ─── Traffic & Zips ────────────────────────────────────────────

model Traffic {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  upload    BigInt   @default(0)
  download  BigInt   @default(0)

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("traffic")
}

model Zip {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  files     String?
  folder    String?

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("zips")
}

// ─── Jobs (BullMQ tracking) ────────────────────────────────────

model FailedJob {
  id         Int      @id @default(autoincrement())
  connection String   @db.Text
  queue      String   @db.Text
  payload    String   @db.Text
  exception  String   @db.Text
  failedAt   DateTime @map("failed_at")

  @@map("failed_jobs")
}
```

---

## 4. Auth Architecture

**Replace:** Laravel Passport (OAuth2) + CookieAuth + SharedAuth + AdminCheck

**With:** Better Auth (session-based, supports email/password, OAuth, 2FA)

### Auth Flow
| Laravel | Next.js |
|---------|---------|
| Passport OAuth2 tokens | Better Auth sessions (cookies) |
| CookieAuth middleware | Server-side session check |
| SharedAuth (token-based) | Share token validation in tRPC context |
| AdminCheck middleware | Role check in tRPC context |
| Auth:api guard | Session validation in tRPC context |

### Roles
- `master` — Account owner (full access to own data)
- `editor` — Can view/edit files (via share link with edit permission)
- `viewer` — Can view files (via share link)
- `admin` — Admin panel access (separate from file roles)

### Middleware → tRPC Context
Every tRPC procedure checks auth via context:
- `protectedProcedure` — Requires authenticated session
- `adminProcedure` — Requires admin role
- `masterProcedure` — Requires master role on own account

---

## 5. tRPC API Structure

```typescript
// Root router
appRouter = router({
  auth:        authRouter,        // Login, register, password reset, email verify
  file:        fileRouter,        // Browse, search, upload, move, rename, delete, zip
  folder:      folderRouter,      // Create, rename, move, delete folders
  share:       shareRouter,       // Create, update, delete, authenticate shares
  user:        userRouter,        // Account settings, avatar, password change
  admin:       adminRouter,       // Dashboard stats, user CRUD, plan CRUD
  subscription: subscriptionRouter, // Plans, invoices, payment methods
  setting:     settingRouter,     // App settings CRUD
  page:        pageRouter,        // CMS pages CRUD
  language:    languageRouter,    // Language management, translations
  invoice:     invoiceRouter,     // Invoice listing (Stripe)
})
```

### API Route Mapping (Laravel → tRPC)

| Laravel Route | tRPC Procedure |
|--------------|----------------|
| POST /api/login | auth.signIn |
| POST /api/register | auth.signUp |
| POST /api/forgot-password | auth.forgotPassword |
| POST /api/reset-password | auth.resetPassword |
| GET /api/browse/{folder?} | file.browse |
| POST /api/create-folder | folder.create |
| PATCH /api/rename-item/{id} | file.rename |
| POST /api/upload | file.upload |
| POST /api/move | file.move |
| POST /api/remove-item | file.delete |
| POST /api/zip | file.zip |
| GET /api/zip-folder/{id} | file.zipFolder |
| GET /api/search | file.search |
| POST /api/favourite | file.toggleFavourite |
| GET /api/trash | file.trash |
| POST /api/restore | file.restore |
| POST /api/permanent-delete | file.permanentDelete |
| POST /api/create-share | share.create |
| PATCH /api/update-share/{id} | share.update |
| DELETE /api/delete-share/{id} | share.delete |
| POST /api/authenticate-share | share.authenticate |
| GET /api/share/{token} | share.getByToken |
| GET /api/admin/dashboard | admin.dashboard |
| GET /api/admin/users | admin.listUsers |
| POST /api/admin/create-user | admin.createUser |
| DELETE /api/admin/delete-user/{id} | admin.deleteUser |
| PATCH /api/admin/change-role | admin.changeRole |
| GET /api/admin/plans | subscription.listPlans |
| GET /api/admin/invoices | invoice.listAll |
| GET /api/settings | setting.getAll |
| PATCH /api/settings | setting.update |
| GET /api/user/account | user.getAccount |
| PATCH /api/user/account | user.updateAccount |
| GET /api/user/subscription | subscription.getCurrent |
| GET /api/user/invoices | invoice.listByUser |
| POST /api/user/payment-method | subscription.addPaymentMethod |
| POST /api/setup/* | setupWizard.* |
| POST /api/emojis-list | file.emojisList |

---

## 6. Frontend Architecture

### Route Groups

```
(auth)/
  login/page.tsx           — Login form
  register/page.tsx        — Registration form
  forgot-password/page.tsx — Password reset request
  reset-password/page.tsx  — Password reset form

(dashboard)/               — Authenticated layout
  layout.tsx               — Sidebar + nav + user menu
  files/page.tsx           — Root file browser
  files/[...folder]/page.tsx — Folder navigation (breadcrumb)
  shared/page.tsx          — My share links
  trash/page.tsx           — Trash view
  favourites/page.tsx      — Favourited folders
  settings/account/page.tsx
  settings/subscription/page.tsx
  settings/payment-methods/page.tsx
  admin/dashboard/page.tsx
  admin/users/page.tsx
  admin/plans/page.tsx
  admin/invoices/page.tsx
  admin/pages/page.tsx
  admin/languages/page.tsx

shared/[token]/            — Public share access (unauthenticated)
  page.tsx

pricing/page.tsx           — Public pricing page
support/page.tsx           — Contact form
```

### Key Components

**File Manager (client-heavy SPA section):**
- `FileManager` — Main container, manages state
- `FileGrid` / `FileList` — Display modes
- `FolderBreadcrumb` — Navigation breadcrumb
- `FileUpload` — Drag & drop + click upload
- `ContextMenu` — Right-click menu (rename, move, delete, share, etc.)
- `ShareModal` — Create/edit share links
- `PreviewModal` — File preview (images, PDF, text)
- `TrashView` — Trash with restore/permanent delete
- `FavouritesView` — Favourited folders

**Admin Panel:**
- `AdminDashboard` — Stats cards (users, storage, premium)
- `UserTable` — User list with sort, paginate, CRUD
- `PlanTable` — Subscription plan management
- `InvoiceTable` — Invoice history
- `PageEditor` — CMS page editor
- `LanguageManager` — Translation string editor

---

## 7. File Storage Architecture

**Replace:** Laravel Storage facade (S3/local) + Flysystem

**With:** AWS SDK S3 client directly + local fallback

### File Path Convention
```
storage/{user_id}/{folder_unique_id}/{file_unique_id}_{original_name}
```

### Upload Flow
1. Client → tRPC `file.upload` (multipart)
2. Server validates file type, size, user storage quota
3. Upload to S3 with unique key
4. Generate thumbnail if image
5. Extract EXIF data if applicable
6. Create DB record
7. Return file metadata

### Storage Quota
- Tracked via `user_settings.storage_capacity` (plan-based limit)
- `Traffic` model tracks upload bytes
- Enforced before each upload

---

## 8. Background Jobs (BullMQ)

| Job | Trigger | Description |
|-----|---------|-------------|
| `GenerateThumbnail` | File upload (image) | Create thumbnail for image files |
| `ExtractExif` | File upload (image) | Extract EXIF metadata |
| `CreateZip` | User requests zip | Zip multiple files for download |
| `DeleteExpiredShares` | Cron (daily) | Remove shares past expiration |
| `SyncStripeData` | Webhook | Sync subscription/payment data |
| `SendShareEmail` | Share creation (email) | Send share link via email |

---

## 9. Cron Jobs

| Schedule | Job | Description |
|----------|-----|-------------|
| Daily 00:00 | `DeleteExpiredShares` | Clean up expired shares |
| Daily 00:00 | `CleanupTrash` | Permanently delete items in trash >30 days |
| Hourly | `SyncStripeSubscriptions` | Verify active subscription statuses |

---

## 10. Localization

**Replace:** DB-stored translations with `LanguageService`

**Keep:** DB-stored approach (compatible with existing data)

### Implementation
- `Language` model: Language definitions (en, es, etc.)
- `LanguageString` model: Key-value translation pairs per language
- `useTranslation(languageId)` hook: Fetches translations, caches in client
- tRPC `language` router: CRUD for languages and strings
- Admin UI: Translation editor (existing feature parity)

---

## 11. Migration Phases

### Phase 1: Project Scaffold + DB Schema
- Initialize Next.js project with TypeScript, App Router
- Set up Prisma with full schema
- Configure Shadcn UI, Tailwind, tRPC
- Set up Better Auth
- Docker configuration
- CI/CD scaffold

### Phase 2: Auth System
- Registration, login, logout
- Password reset, email verification
- Session management
- Role-based access (master/admin/editor/viewer)

### Phase 3: File Management Core
- Folder CRUD with hierarchy
- File upload, rename, move, delete
- File browsing with breadcrumb navigation
- Search (PostgreSQL full-text)
- Favourites
- Trash with restore/permanent delete
- Zip download

### Phase 4: Sharing System
- Create/edit/delete share links
- Token-based public access
- Password-protected shares
- Expiration support
- Email sharing

### Phase 5: Admin Panel
- Dashboard with stats
- User management (CRUD, roles, storage)
- Plan management
- Invoice listing
- Pages CMS
- Language/translation management

### Phase 6: Subscriptions & Billing
- Stripe integration (plans, checkout, customer portal)
- Payment method management
- Webhook handling
- Subscription lifecycle (create, upgrade, cancel)
- Invoice listing

### Phase 7: Localization
- Translation CRUD
- Client-side translation hook
- Multi-language support

### Phase 8: Public Pages + Polish
- Pricing page
- Shared file access (public)
- Support form
- Setup wizard
- OG/meta tags
- Performance optimization
- Testing

---

## 12. Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| ORM | Prisma |
| Database | PostgreSQL |
| API | tRPC |
| Auth | Better Auth |
| UI | Shadcn UI + Radix + TailwindCSS |
| Animations | Framer Motion |
| Forms | React Hook Form + Zod |
| State | TanStack Query (via tRPC) + Zustand (global) |
| Payments | Stripe SDK |
| File Storage | AWS S3 SDK |
| Background Jobs | BullMQ + Redis |
| Email | Resend (or Nodemailer) |
| Testing | Vitest + Playwright |
| Package Manager | pnpm |
| Linting | ESLint |
| Formatting | Prettier |

---

## 13. Security Considerations

- OWASP compliance throughout
- CSRF protection via Better Auth sessions
- File type validation (MIME + magic bytes)
- Storage quota enforcement
- Rate limiting on auth endpoints
- Share token expiration
- Password hashing (bcrypt via Better Auth)
- Input validation via Zod on every tRPC procedure
- Output sanitization
- No mass assignment (explicit field selection in Prisma)
- Path traversal prevention (unique IDs, not file paths)
- XSS prevention (React escaping + CSP headers)

---

## 14. Known Migration Risks

1. **Vue.js SPA → React SPA:** File manager UI rewrite needed, behavioral parity critical
2. **Stripe integration:** Existing webhook handlers must be ported exactly
3. **Share links:** Token format and URL structure must remain compatible
4. **File storage paths:** Need migration strategy for existing files in S3
5. **Passport → Better Auth:** Token-based API → session-based; affects any external integrations
6. **TNTSearch → PostgreSQL FTS:** Search behavior may differ; needs testing
7. **Existing data:** Migration scripts needed for existing DB data
