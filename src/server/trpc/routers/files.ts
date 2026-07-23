// src/server/trpc/routers/files.ts
import { router } from '../index';
import { protectedProcedure } from '../procedures';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const filesRouter = router({
  // ─── Folders ────────────────────────────────────────────────────
  listFolders: protectedProcedure
    .input(z.object({ parentId: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const folders = await ctx.db.fileManagerFolder.findMany({
        where: {
          parentId: input.parentId,
          userId: Number(ctx.session.user.id),
          deletedAt: null,
        },
        orderBy: { name: 'asc' },
      });
      return folders;
    }),

  getBreadcrumb: protectedProcedure
    .input(z.object({ folderId: z.number() }))
    .query(async ({ ctx, input }) => {
      const path: { uniqueId: number; name: string | null; parentId: number }[] = [];
      let currentId = input.folderId;

      while (currentId !== 0) {
        const folder = await ctx.db.fileManagerFolder.findFirst({
          where: { uniqueId: currentId, userId: Number(ctx.session.user.id) },
          select: { uniqueId: true, name: true, parentId: true },
        });
        if (!folder) break;
        path.unshift(folder);
        currentId = folder.parentId;
      }

      return path;
    }),

  createFolder: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(255), parentId: z.number().default(0) }))
    .mutation(async ({ ctx, input }) => {
      const folder = await ctx.db.fileManagerFolder.create({
        data: {
          name: input.name,
          parentId: input.parentId,
          userId: Number(ctx.session.user.id),
          userScope: 'master',
        },
      });
      return folder;
    }),

  renameItem: protectedProcedure
    .input(z.object({ uniqueId: z.number(), name: z.string().min(1).max(255), type: z.enum(['file', 'folder']) }))
    .mutation(async ({ ctx, input }) => {
      if (input.type === 'folder') {
        const folder = await ctx.db.fileManagerFolder.update({
          where: { uniqueId: input.uniqueId },
          data: { name: input.name },
        });
        return folder;
      }
      const file = await ctx.db.fileManagerFile.update({
        where: { uniqueId: input.uniqueId },
        data: { name: input.name },
      });
      return file;
    }),

  deleteItem: protectedProcedure
    .input(z.object({ uniqueId: z.number(), type: z.enum(['file', 'folder']) }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      if (input.type === 'folder') {
        // Soft delete folder and all descendants
        await ctx.db.fileManagerFolder.update({
          where: { uniqueId: input.uniqueId },
          data: { deletedAt: now },
        });
        // Recursive child deletion handled in Task 9 via improved moveItem/deleteItem
      } else {
        await ctx.db.fileManagerFile.update({
          where: { uniqueId: input.uniqueId },
          data: { deletedAt: now },
        });
      }
      return { success: true };
    }),

  moveItem: protectedProcedure
    .input(z.object({ uniqueId: z.number(), toFolderId: z.number(), type: z.enum(['file', 'folder']) }))
    .mutation(async ({ ctx, input }) => {
      if (input.type === 'folder') {
        // Cycle detection: walk up from toFolderId to root, ensure uniqueId is not an ancestor
        let currentParent = input.toFolderId;
        while (currentParent !== 0) {
          if (currentParent === input.uniqueId) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot move folder into its own descendant' });
          }
          const parent = await ctx.db.fileManagerFolder.findFirst({
            where: { uniqueId: currentParent },
            select: { parentId: true },
          });
          if (!parent) break;
          currentParent = parent.parentId;
        }
        const folder = await ctx.db.fileManagerFolder.update({
          where: { uniqueId: input.uniqueId },
          data: { parentId: input.toFolderId },
        });
        return folder;
      }
      const file = await ctx.db.fileManagerFile.update({
        where: { uniqueId: input.uniqueId },
        data: { folderId: input.toFolderId },
      });
      return file;
    }),

  // ─── Files ──────────────────────────────────────────────────────
  listFiles: protectedProcedure
    .input(z.object({ folderId: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const files = await ctx.db.fileManagerFile.findMany({
        where: {
          folderId: input.folderId,
          userId: Number(ctx.session.user.id),
          deletedAt: null,
        },
        orderBy: { name: 'asc' },
      });
      return files;
    }),

  createFile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      basename: z.string().min(1).max(255),
      mimetype: z.string().min(1),
      filesize: z.string().min(1),
      folderId: z.number().default(0),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check storage quota
      const settings = await ctx.db.userSettings.findUnique({
        where: { userId: Number(ctx.session.user.id) },
      });
      const capacity = settings?.storageCapacity ?? 5;

      // Sum filesize manually since it's stored as String in DB
      const existingFiles = await ctx.db.fileManagerFile.findMany({
        where: { userId: Number(ctx.session.user.id), deletedAt: null },
        select: { filesize: true },
      });
      const usedBytes = existingFiles.reduce(
        (sum, f) => sum + BigInt(f.filesize ?? '0'),
        BigInt(0),
      );
      const limitBytes = BigInt(capacity * 1024 * 1024 * 1024);
      const fileSizeBigInt = BigInt(input.filesize);

      if (usedBytes + fileSizeBigInt > limitBytes) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Storage quota exceeded' });
      }

      // Create file record
      const file = await ctx.db.fileManagerFile.create({
        data: {
          name: input.name,
          basename: input.basename,
          mimetype: input.mimetype,
          filesize: input.filesize,
          folderId: input.folderId,
          userId: Number(ctx.session.user.id),
          userScope: 'master',
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        },
      });
      return file;
    }),

  getPresignedUrl: protectedProcedure
    .input(z.object({
      filename: z.string().min(1),
      mimetype: z.string().min(1),
      filesize: z.number().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getS3Key, getPresignedUploadUrl } = await import('@/lib/s3');
      const userId = Number(ctx.session.user.id);
      // Use a temporary uniqueId of 0; actual uniqueId assigned on confirmUpload
      const key = getS3Key(userId, 0, input.filename);
      const url = await getPresignedUploadUrl(key, input.mimetype);
      return { url, key };
    }),

  confirmUpload: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      basename: z.string().min(1).max(255),
      mimetype: z.string().min(1),
      filesize: z.string().min(1),
      folderId: z.number().default(0),
      key: z.string().min(1),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.db.fileManagerFile.create({
        data: {
          name: input.name,
          basename: input.basename,
          mimetype: input.mimetype,
          filesize: input.filesize,
          folderId: input.folderId,
          userId: Number(ctx.session.user.id),
          userScope: 'master',
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        },
      });
      return file;
    }),

  getPreviewUrl: protectedProcedure
    .input(z.object({ uniqueId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { getPresignedDownloadUrl } = await import('@/lib/s3');
      const file = await ctx.db.fileManagerFile.findFirst({
        where: { uniqueId: input.uniqueId, userId: Number(ctx.session.user.id) },
      });
      if (!file) throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });

      const url = await getPresignedDownloadUrl(String(file.uniqueId));
      return { url, mimetype: file.mimetype, name: file.name };
    }),

  // ─── Quota ──────────────────────────────────────────────────────
  getQuota: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.userSettings.findUnique({
      where: { userId: Number(ctx.session.user.id) },
    });
    const capacity = settings?.storageCapacity ?? 5;

    // Sum filesize manually since it's stored as String in DB
    const existingFiles = await ctx.db.fileManagerFile.findMany({
      where: { userId: Number(ctx.session.user.id), deletedAt: null },
      select: { filesize: true },
    });
    const usedBytes = existingFiles.reduce(
      (sum, f) => sum + BigInt(f.filesize ?? '0'),
      BigInt(0),
    );
    const limitBytes = BigInt(capacity * 1024 * 1024 * 1024);
    return { used: Number(usedBytes), limit: Number(limitBytes), capacity };
  }),

  // ─── Search ─────────────────────────────────────────────────────
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(255), parentId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const where = {
        userId: Number(ctx.session.user.id),
        deletedAt: null,
        name: { contains: input.query, mode: 'insensitive' as const },
        ...(input.parentId !== undefined ? { folderId: input.parentId } : {}),
      };
      const files = await ctx.db.fileManagerFile.findMany({ where, orderBy: { name: 'asc' } });
      return files;
    }),
});
