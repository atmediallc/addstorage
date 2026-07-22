# Phase 1: Project Scaffold + DB Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the Next.js project with full tooling, complete Prisma schema for all 14 tables, tRPC router skeleton, Better Auth foundation, and Docker/CI scaffold.

**Architecture:** Next.js 14 App Router monolith with tRPC for all data operations, Prisma ORM on PostgreSQL, Better Auth for sessions, Shadcn UI + Tailwind for styling. Feature-based folder structure under `src/`.

**Tech Stack:** Next.js 14, TypeScript (strict), Prisma, PostgreSQL, tRPC v11, Better Auth, Shadcn UI, Radix UI, TailwindCSS, Zod, pnpm, Vitest, Docker

## Global Constraints

- TypeScript strict mode — no `any`, no unsafe casts
- pnpm as package manager
- ESLint + Prettier configured
- All Prisma models use `@map` for snake_case table/column names
- Zod validation on every tRPC procedure
- No placeholder code — every file must be functional
- Frequent commits (one per task)

---

## File Structure

```
tutiscloud/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout (html, body, providers)
│   │   ├── page.tsx                      # Landing page (redirect to /files or /login)
│   │   ├── globals.css                   # Tailwind base + Shadcn CSS vars
│   │   ├── (auth)/
│   │   │   ├── layout.tsx                # Auth layout (centered card)
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                # Dashboard layout (sidebar + nav)
│   │   │   ├── files/page.tsx            # Root file browser
│   │   │   └── files/[...folder]/page.tsx
│   │   └── api/auth/[...all]/route.ts    # Better Auth catch-all
│   ├── server/
│   │   ├── db/
│   │   │   └── index.ts                  # Prisma client singleton
│   │   ├── auth/
│   │   │   ├── index.ts                  # Better Auth config
│   │   │   └── client.ts                 # Better Auth client helpers
│   │   └── trpc/
│   │       ├── context.ts                # Request context (session, db)
│   │       ├── root.ts                   # Root router (merges all)
│   │       ├── index.ts                  # Public/protected/admin procedure defs
│   │       └── routers/
│   │           ├── _app.ts               # tRPC AppRouter type export
│   │           └── placeholder.ts        # Placeholder until real routers added
│   ├── lib/
│   │   ├── utils.ts                      # cn() helper (clsx + twMerge)
│   │   ├── constants.ts                  # App constants
│   │   └── validators.ts                 # Shared Zod schemas
│   ├── components/
│   │   ├── ui/                           # Shadcn components (generated)
│   │   └── providers.tsx                 # tRPC + QueryClient provider
│   └── types/
│       └── index.ts                      # Shared TypeScript types
├── prisma/
│   ├── schema.prisma                     # Full database schema
│   └── seed.ts                           # Database seeder
├── public/                               # Static assets
├── docker/
│   ├── Dockerfile                        # Multi-stage build
│   ├── docker-compose.yml                # Dev environment (pg + redis)
│   └── docker-compose.prod.yml           # Production compose
├── .env.example                          # Environment variables template
├── .eslintrc.json                        # ESLint config
├── .prettierrc                           # Prettier config
├── next.config.ts                        # Next.js config
├── tailwind.config.ts                    # Tailwind config
├── tsconfig.json                         # TypeScript config (strict)
├── package.json
├── pnpm-lock.yaml
└── vitest.config.ts                      # Test config
```

---

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.eslintrc.json`, `.prettierrc`, `.env.example`, `.gitignore`

**Interfaces:**
- Produces: A working Next.js 14 project that runs with `pnpm dev`

- [ ] **Step 1: Create the project**

```bash
cd C:/proyectos/tutiscloud/tutiscloud
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-pnpm
```

Select defaults: TypeScript ✓, ESLint ✓, Tailwind CSS ✓, App Router ✓, src/ directory ✓, import alias `@/*` ✓.

- [ ] **Step 2: Verify it runs**

```bash
pnpm dev
```
Expected: Server starts on http://localhost:3000, shows Next.js starter page.

- [ ] **Step 3: Install additional dependencies**

```bash
pnpm add zod @trpc/server@next @trpc/client@next @trpc/react-query@next @trpc/next@next @tanstack/react-query @tanstack/react-query-devtools better-auth @prisma/client stripe @aws-sdk/client-s3 bullmq ioredis sharp uuid
pnpm add -D prisma @types/node prettier eslint-config-prettier vitest @vitejs/plugin-react
```

- [ ] **Step 4: Configure Prettier**

Write `.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 5: Configure TypeScript strict mode**

Edit `tsconfig.json` — ensure `"strict": true` is set (Next.js template includes this by default). Verify:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": { "@/*": ["./src/*"] },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 6: Configure ESLint with Prettier**

Write `.eslintrc.json`:
```json
{
  "extends": ["next/core-web-vitals", "prettier"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "error"
  }
}
```

- [ ] **Step 7: Write .env.example**

```
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tutiscloud?schema=public"

# Auth
BETTER_AUTH_SECRET="change-me-to-random-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# Stripe
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# S3 Storage
S3_BUCKET=""
S3_REGION=""
S3_ACCESS_KEY=""
S3_SECRET_KEY=""
S3_ENDPOINT=""

# Redis (BullMQ)
REDIS_URL="redis://localhost:6379"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] **Step 8: Write .gitignore**

Add to existing `.gitignore`:
```
.env
.env.local
.env.*.local
node_modules/
.next/
out/
*.tsbuildinfo
.env.example
```

- [ ] **Step 9: Commit**

```bash
git init
git add -A
git commit -m "feat: initialize Next.js 14 project with TypeScript, Tailwind, tRPC, Better Auth, Prisma deps"
```

---

### Task 2: Docker Environment

**Files:**
- Create: `docker/docker-compose.yml`, `docker/Dockerfile`, `.env.example` (update)

**Interfaces:**
- Produces: `docker-compose up` starts PostgreSQL + Redis for local dev

- [ ] **Step 1: Write docker-compose.yml**

Write `docker/docker-compose.yml`:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: tutiscloud
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

- [ ] **Step 2: Write Dockerfile**

Write `docker/Dockerfile`:
```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

- [ ] **Step 3: Start docker services**

```bash
cd C:/proyectos/tutiscloud/tutiscloud
docker compose -f docker/docker-compose.yml up -d
```

Verify PostgreSQL is running:
```bash
docker compose -f docker/docker-compose.yml exec postgres psql -U postgres -c "SELECT 1;"
```
Expected: Returns `1`.

- [ ] **Step 4: Commit**

```bash
git add docker/ .env.example
git commit -m "feat: add Docker environment with PostgreSQL 16 and Redis 7"
```

---

### Task 3: Prisma Schema — All Tables

**Files:**
- Create: `prisma/schema.prisma`, `src/server/db/index.ts`, `prisma/seed.ts`

**Interfaces:**
- Produces: `npx prisma db push` succeeds with all 14 tables
- Produces: `src/server/db/index.ts` exports `db` (PrismaClient singleton)

- [ ] **Step 1: Write the full Prisma schema**

Write `prisma/schema.prisma`:
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

  // Stripe columns
  stripeId        String?   @unique @map("stripe_id")
  cardBrand       String?   @map("card_brand")
  cardLastFour    String?   @map("card_last_four") @db.VarChar(4)
  trialEndsAt     DateTime? @map("trial_ends_at")

  // Role
  role            String    @default("master")

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  files              FileManagerFile[]
  folders            FileManagerFolder[]
  settings           UserSettings?
  favourites         FavouriteFolder[]
  shares             Share[]
  subscriptions      Subscription[]
  traffic            Traffic[]
  zips               Zip[]

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

  userId      Int?      @map("user_id")
  userScope   String    @default("master") @map("user_scope")

  iconColor   String?   @map("icon_color")
  iconEmoji   String?   @map("icon_emoji")

  deletedAt   DateTime? @map("deleted_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  user        User?              @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent      FileManagerFolder?  @relation("FolderTree", fields: [parentId], references: [uniqueId])
  children    FileManagerFolder[]  @relation("FolderTree")
  files       FileManagerFile[]
  favourites  FavouriteFolder[]
  shares      Share[]

  @@index([userId])
  @@index([parentId])
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

  userId      Int?      @map("user_id")
  userScope   String    @default("master") @map("user_scope")

  metadata    String?   @db.LongText

  deletedAt   DateTime? @map("deleted_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  user    User?              @relation(fields: [userId], references: [id], onDelete: Cascade)
  folder  FileManagerFolder? @relation(fields: [folderId], references: [uniqueId])
  shares  Share[]

  @@index([userId])
  @@index([folderId])
  @@map("file_manager_files")
}

// ─── Sharing ────────────────────────────────────────────────────

model Share {
  id          Int       @id @default(autoincrement())
  userId      Int       @map("user_id")
  token       String    @unique @db.VarChar(16)
  itemId      Int       @map("item_id")
  type        String
  permission  String?
  protected   Boolean   @default(false)
  password    String?
  expireIn    Int?      @map("expire_in")

  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  user    User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  file    FileManagerFile?   @relation(fields: [itemId], references: [uniqueId])
  folder  FileManagerFolder? @relation(fields: [itemId], references: [uniqueId])

  @@index([userId])
  @@index([token])
  @@map("shares")
}

// ─── Subscriptions ──────────────────────────────────────────────

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

  subscription Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@unique([subscriptionId, stripePlan])
  @@map("subscription_items")
}

// ─── User Settings ──────────────────────────────────────────────

model UserSettings {
  id                Int     @id @default(autoincrement())
  userId            Int     @unique @map("user_id")
  storageCapacity   Int     @default(5) @map("storage_capacity")
  billingName       String? @map("billing_name")
  billingAddress    String? @map("billing_address")
  billingState      String? @map("billing_state")
  billingCity       String? @map("billing_city")
  billingPostalCode String? @map("billing_postal_code")
  billingCountry    String? @map("billing_country")
  billingPhoneNumber String? @map("billing_phone_number")
  timezone          String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_settings")
}

// ─── App Settings ───────────────────────────────────────────────

model Setting {
  id    Int     @id @default(autoincrement())
  name  String  @unique
  value String?

  @@map("settings")
}

// ─── CMS Pages ──────────────────────────────────────────────────

model Page {
  id         Int      @id @default(autoincrement())
  visibility Boolean  @default(true)
  title      String
  slug       String   @unique
  content    String   @db.LongText

  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

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
  id      String  @id @default(uuid())
  name    String
  locale  String  @unique

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  strings LanguageString[]

  @@map("languages")
}

model LanguageString {
  id         Int      @id @default(autoincrement())
  languageId String   @map("language_id")
  key        String
  value      String   @db.LongText

  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

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
  id           String  @id @default(uuid())
  userId       Int     @map("user_id")
  sharedToken  String? @map("shared_token")
  basename     String

  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("zips")
}

// ─── Queue Tracking ─────────────────────────────────────────────

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

- [ ] **Step 2: Write Prisma client singleton**

Write `src/server/db/index.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

- [ ] **Step 3: Write seed file**

Write `prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create default admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tutiscloud.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@tutiscloud.com',
      password: '$2b$10$placeholder', // Will be replaced by Better Auth
      role: 'admin',
      emailVerifiedAt: new Date(),
    },
  });

  // Create default settings
  const settings = [
    { name: 'app_name', value: 'TutisCloud' },
    { name: 'app_version', value: '1.0.0' },
    { name: 'app_url', value: 'http://localhost:3000' },
    { name: 'license', value: 'enterprise' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { name: setting.name },
      update: { value: setting.value },
      create: setting,
    });
  }

  // Create default language (English)
  await prisma.language.upsert({
    where: { locale: 'en' },
    update: {},
    create: {
      id: 'en-lang',
      name: 'English',
      locale: 'en',
    },
  });

  // Create Spanish language
  await prisma.language.upsert({
    where: { locale: 'es' },
    update: {},
    create: {
      id: 'es-lang',
      name: 'Spanish',
      locale: 'es',
    },
  });

  // Create default payment gateways
  await prisma.paymentGateway.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Stripe', slug: 'stripe' },
  });

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 4: Run Prisma schema push**

```bash
cd C:/proyectos/tutiscloud/tutiscloud
npx prisma db push
```
Expected: All 14 tables created successfully in PostgreSQL.

- [ ] **Step 5: Generate Prisma client**

```bash
npx prisma generate
```
Expected: PrismaClient generated successfully.

- [ ] **Step 6: Run seed**

```bash
npx prisma db seed
```
Expected: Seed completed successfully. Verify admin user exists:
```bash
npx prisma studio
```

- [ ] **Step 7: Commit**

```bash
git add prisma/ src/server/db/
git commit -m "feat: complete Prisma schema with all 14 tables + seed data"
```

---

### Task 4: Utility Files

**Files:**
- Create: `src/lib/utils.ts`, `src/lib/constants.ts`, `src/lib/validators.ts`

**Interfaces:**
- Produces: `cn()` utility for class merging
- Produces: App constants (roles, limits, file types)
- Produces: Shared Zod schemas for validation

- [ ] **Step 1: Write utils.ts**

Write `src/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function generateToken(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
```

- [ ] **Step 2: Write constants.ts**

Write `src/lib/constants.ts`:
```typescript
export const ROLES = {
  ADMIN: 'admin',
  MASTER: 'master',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const FILE_TYPES = {
  FOLDER: 'folder',
  FILE: 'file',
} as const;

export const SHARE_TYPES = {
  FILE: 'file',
  FILES: 'files',
  FOLDER: 'folder',
} as const;

export const SHARE_PERMISSIONS = {
  VISITOR: 'visitor',
  EDITOR: 'editor',
} as const;

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export const TRASH_RETENTION_DAYS = 30;

export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
```

- [ ] **Step 3: Write validators.ts**

Write `src/lib/validators.ts`:
```typescript
import { z } from 'zod';

// ─── Auth ───────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  passwordConfirm: z.string(),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'Passwords do not match',
  path: ['passwordConfirm'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  passwordConfirm: z.string(),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'Passwords do not match',
  path: ['passwordConfirm'],
});

// ─── File Operations ────────────────────────────────────────────

export const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(255),
  parentId: z.number().optional().default(0),
});

export const renameItemSchema = z.object({
  uniqueId: z.number(),
  name: z.string().min(1, 'Name is required').max(255),
  type: z.enum(['file', 'folder']),
});

export const deleteItemSchema = z.object({
  uniqueId: z.number(),
  type: z.enum(['file', 'folder']),
});

export const moveItemSchema = z.object({
  uniqueId: z.number(),
  toFolderId: z.number(),
  type: z.enum(['file', 'folder']),
});

// ─── Sharing ────────────────────────────────────────────────────

export const createShareSchema = z.object({
  itemId: z.number(),
  type: z.enum(['file', 'files', 'folder']),
  permission: z.enum(['visitor', 'editor']).optional(),
  protected: z.boolean().optional().default(false),
  password: z.string().optional(),
  expireIn: z.number().optional(),
});

export const authenticateShareSchema = z.object({
  token: z.string(),
  password: z.string().optional(),
});

// ─── Admin ──────────────────────────────────────────────────────

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'master', 'editor', 'viewer']).optional().default('master'),
});

export const changeRoleSchema = z.object({
  userId: z.number(),
  role: z.enum(['admin', 'master', 'editor', 'viewer']),
});

export const updateStorageSchema = z.object({
  userId: z.number(),
  storageCapacity: z.number().min(0),
});

// ─── Settings ───────────────────────────────────────────────────

export const updateSettingSchema = z.object({
  name: z.string(),
  value: z.string().optional(),
});

// ─── Pages ──────────────────────────────────────────────────────

export const createPageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string(),
  visibility: z.boolean().optional().default(true),
});

export const updatePageSchema = createPageSchema.partial();

// ─── Languages ──────────────────────────────────────────────────

export const createLanguageSchema = z.object({
  name: z.string().min(1),
  locale: z.string().min(2).max(5),
});

export const updateTranslationSchema = z.object({
  languageId: z.string(),
  key: z.string().min(1),
  value: z.string(),
});

// ─── User Account ───────────────────────────────────────────────

export const updateAccountSchema = z.object({
  name: z.string().min(2).optional(),
  avatar: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
```

- [ ] **Step 4: Verify no type errors**

```bash
pnpm tsc --noEmit
```
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/
git commit -m "feat: add shared utilities, constants, and Zod validators"
```

---

### Task 5: Better Auth Setup

**Files:**
- Create: `src/server/auth/index.ts`, `src/server/auth/client.ts`, `src/app/api/auth/[...all]/route.ts`

**Interfaces:**
- Consumes: `db` from `src/server/db`
- Produces: `auth` config, `getSession()` helper, Better Auth API route

- [ ] **Step 1: Write auth config**

Write `src/server/auth/index.ts`:
```typescript
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { db } from '@/server/db';

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Match Laravel behavior
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days (match Laravel "remember me")
    updateAge: 60 * 60 * 24, // Refresh every 24 hours
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'master',
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
    },
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ],
});

export type Session = typeof auth.$Infer.Session;
```

- [ ] **Step 2: Write auth client helpers**

Write `src/server/auth/client.ts`:
```typescript
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

- [ ] **Step 3: Write auth API route**

Write `src/app/api/auth/[...all]/route.ts`:
```typescript
import { auth } from '@/server/auth';

export const { GET, POST } = auth.handlers;
```

- [ ] **Step 4: Verify auth endpoint responds**

```bash
curl http://localhost:3000/api/auth/get-session
```
Expected: Returns `null` or empty session (no error).

- [ ] **Step 5: Commit**

```bash
git add src/server/auth/ src/app/api/auth/
git commit -m "feat: configure Better Auth with Prisma adapter and session handling"
```

---

### Task 6: tRPC Foundation

**Files:**
- Create: `src/server/trpc/index.ts`, `src/server/trpc/context.ts`, `src/server/trpc/root.ts`, `src/server/trpc/routers/_app.ts`, `src/server/trpc/routers/placeholder.ts`, `src/components/providers.tsx`

**Interfaces:**
- Consumes: `db` from `src/server/db`, `auth` from `src/server/auth`
- Produces: `appRouter` type export, `publicProcedure`, `protectedProcedure`, `adminProcedure`

- [ ] **Step 1: Write tRPC context**

Write `src/server/trpc/context.ts`:
```typescript
import { inferAsyncReturnType } from '@trpc/server';
import { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { db } from '@/server/db';
import { auth } from '@/server/auth';

export async function createContext({ req, res }: CreateNextContextOptions) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  return {
    db,
    session,
    req,
    res,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

- [ ] **Step 2: Write tRPC initialization with procedures**

Write `src/server/trpc/index.ts`:
```typescript
import { initTRPC, TRPCError } from '@trpc/server';
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

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.session.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});
```

- [ ] **Step 3: Write placeholder router**

Write `src/server/trpc/routers/placeholder.ts`:
```typescript
import { router, publicProcedure } from '../index';
import { z } from 'zod';

export const placeholderRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }).optional())
    .query(({ input }) => {
      return { message: `Hello ${input?.name ?? 'World'}!` };
    }),
});
```

- [ ] **Step 4: Write root router**

Write `src/server/trpc/root.ts`:
```typescript
import { router } from './index';
import { placeholderRouter } from './routers/placeholder';

export const appRouter = router({
  placeholder: placeholderRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 5: Write tRPC AppRouter export**

Write `src/server/trpc/routers/_app.ts`:
```typescript
export { appRouter, type AppRouter } from '../root';
```

- [ ] **Step 6: Write TRPC provider**

Write `src/components/providers.tsx`:
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';

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
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
```

- [ ] **Step 7: Write tRPC client helper**

Write `src/lib/trpc.ts`:
```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/trpc/root';

export const trpc = createTRPCReact<AppRouter>();
```

- [ ] **Step 8: Write tRPC API handler**

Write `src/app/api/trpc/[trpc]/route.ts`:
```typescript
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc/root';
import { createContext } from '@/server/trpc/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };
```

- [ ] **Step 9: Update root layout to use Providers**

Write `src/app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TutisCloud',
  description: 'Cloud file storage and sharing platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 10: Verify tRPC works**

```bash
curl "http://localhost:3000/api/trpc/placeholder.hello?input=%7B%22name%22%3A%22Tutis%22%7D"
```
Expected: `{"result":{"data":{"message":"Hello Tutis!"}}}`

- [ ] **Step 11: Commit**

```bash
git add src/server/trpc/ src/lib/trpc.ts src/components/providers.tsx src/app/layout.tsx src/app/api/trpc/
git commit -m "feat: set up tRPC with public/protected/admin procedures and React provider"
```

---

### Task 7: Root App Page + Auth Layout Shell

**Files:**
- Create: `src/app/(auth)/layout.tsx`, `src/app/(dashboard)/layout.tsx`, `src/app/page.tsx`

**Interfaces:**
- Consumes: `useSession` from `src/server/auth/client`
- Produces: Functional root page that redirects, auth layout shell, dashboard layout shell

- [ ] **Step 1: Write auth layout**

Write `src/app/(auth)/layout.tsx`:
```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 px-4">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write dashboard layout shell**

Write `src/app/(dashboard)/layout.tsx`:
```typescript
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      {/* Sidebar placeholder — will be built in Phase 3 */}
      <aside className="hidden w-64 border-r bg-gray-50 lg:block">
        <div className="p-4">
          <h1 className="text-lg font-bold">TutisCloud</h1>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Write root page with redirect**

Write `src/app/page.tsx`:
```typescript
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/files');
}
```

- [ ] **Step 4: Verify build**

```bash
pnpm build
```
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(auth\)/ src/app/\(dashboard\)/ src/app/page.tsx
git commit -m "feat: add root layout shells for auth and dashboard route groups"
```

---

### Task 8: Vitest Setup

**Files:**
- Create: `vitest.config.ts`, `src/lib/__tests__/utils.test.ts`

**Interfaces:**
- Consumes: `cn`, `formatBytes`, `generateToken` from `src/lib/utils`
- Produces: Working test configuration

- [ ] **Step 1: Write vitest config**

Write `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 2: Write utils tests**

Write `src/lib/__tests__/utils.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { cn, formatBytes, generateToken } from '../utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra');
  });
});

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });
});

describe('generateToken', () => {
  it('generates token of specified length', () => {
    expect(generateToken(16)).toHaveLength(16);
    expect(generateToken(32)).toHaveLength(32);
  });

  it('generates unique tokens', () => {
    const token1 = generateToken(16);
    const token2 = generateToken(16);
    expect(token1).not.toBe(token2);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm vitest run
```
Expected: All 7 tests pass.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts src/lib/__tests__/
git commit -m "feat: add Vitest configuration and utility tests"
```

---

### Task 9: Final Integration Check

**Files:**
- Modify: None (verification only)

**Interfaces:**
- Consumes: All previous tasks
- Produces: All checks pass

- [ ] **Step 1: TypeScript check**

```bash
pnpm tsc --noEmit
```
Expected: Zero errors.

- [ ] **Step 2: ESLint check**

```bash
pnpm lint
```
Expected: No errors (warnings OK).

- [ ] **Step 3: Vitest check**

```bash
pnpm vitest run
```
Expected: All tests pass.

- [ ] **Step 4: Build check**

```bash
pnpm build
```
Expected: Build succeeds.

- [ ] **Step 5: Prisma check**

```bash
npx prisma validate
```
Expected: Schema is valid.

- [ ] **Step 6: Docker services check**

```bash
docker compose -f docker/docker-compose.yml ps
```
Expected: PostgreSQL and Redis both running.

- [ ] **Step 7: Commit any fixups**

```bash
git add -A
git commit -m "chore: Phase 1 complete — scaffold, schema, auth, tRPC foundation"
```

---

## Phase 1 Completion Checklist

- [ ] Next.js 14 project initialized with TypeScript strict mode
- [ ] pnpm configured as package manager
- [ ] Docker environment (PostgreSQL 16 + Redis 7) running
- [ ] Prisma schema with all 14 tables validated and pushed
- [ ] Prisma client generated and seeded
- [ ] Better Auth configured with session handling
- [ tRPC v11 with public/protected/admin procedures
- [ ] tRPC React provider and client wired up
- [ ] Shadcn UI + Tailwind configured
- [ ] Zod validators for all entities
- [ ] Vitest configured with utility tests passing
- [ ] ESLint + Prettier configured
- [ ] Root layouts (auth + dashboard) in place
- [ ] All checks pass: tsc, eslint, vitest, build, prisma validate

## Next Phase

Phase 2: Auth System — registration, login, password reset, email verification, role-based middleware. See `2026-07-22-phase2-auth-system.md`.
