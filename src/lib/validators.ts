import { z } from 'zod';

// ─── Auth ───────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Passwords do not match',
    path: ['passwordConfirm'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
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
  role: z
    .enum(['admin', 'master', 'editor', 'viewer'])
    .optional()
    .default('master'),
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

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
