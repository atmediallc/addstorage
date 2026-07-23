import { z } from 'zod';

// ─── Auth ───────────────────────────────────────────────────────

const passwordValidation = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^A-Za-z0-9]/,
    'Password must contain at least one special character',
  );

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: passwordValidation,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, 'You must accept the terms and conditions'),
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
    password: passwordValidation,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

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

// ─── File Manager ───────────────────────────────────────────────

export const createFileSchema = z.object({
  name: z.string().min(1).max(255),
  basename: z.string().min(1).max(255),
  mimetype: z.string().min(1),
  filesize: z.string().min(1), // stored as string in DB
  folderId: z.number().default(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const listFilesSchema = z.object({
  folderId: z.number().default(0),
});

export const getBreadcrumbSchema = z.object({
  folderId: z.number(),
});

export const quotaCheckSchema = z.object({
  size: z.number().min(0),
});

export const bulkDeleteSchema = z.object({
  items: z.array(z.object({
    uniqueId: z.number(),
    type: z.enum(['file', 'folder']),
  })).min(1).max(100),
});

export const bulkMoveSchema = z.object({
  ids: z.array(z.number()).min(1).max(100),
  type: z.enum(['file', 'folder']),
  toFolderId: z.number(),
});

export const searchSchema = z.object({
  query: z.string().min(1).max(255),
  parentId: z.number().optional(),
});

// ─── Trash ──────────────────────────────────────────────────────

export const trashItemSchema = z.object({
  uniqueId: z.number(),
  type: z.enum(['file', 'folder']),
});

export const emptyTrashSchema = z.object({});
