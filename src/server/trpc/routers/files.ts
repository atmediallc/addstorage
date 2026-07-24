// src/server/trpc/routers/files.ts
import { router } from '../index';
import { protectedProcedure, publicProcedure } from '../procedures';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { randomBytes } from 'crypto';

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

  listAllFolders: protectedProcedure.query(async ({ ctx }) => {
    const folders = await ctx.db.fileManagerFolder.findMany({
      where: {
        userId: Number(ctx.session.user.id),
        deletedAt: null,
      },
      orderBy: { name: 'asc' },
      select: {
        uniqueId: true,
        name: true,
        parentId: true,
      },
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

  // ─── Trash ──────────────────────────────────────────────────────
  listTrash: protectedProcedure.query(async ({ ctx }) => {
    const folders = await ctx.db.fileManagerFolder.findMany({
      where: { userId: Number(ctx.session.user.id), deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
    const files = await ctx.db.fileManagerFile.findMany({
      where: { userId: Number(ctx.session.user.id), deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    });
    return { folders, files };
  }),

  restoreItem: protectedProcedure
    .input(z.object({ uniqueId: z.number(), type: z.enum(['file', 'folder']) }))
    .mutation(async ({ ctx, input }) => {
      if (input.type === 'folder') {
        await ctx.db.fileManagerFolder.update({
          where: { uniqueId: input.uniqueId },
          data: { deletedAt: null },
        });
      } else {
        await ctx.db.fileManagerFile.update({
          where: { uniqueId: input.uniqueId },
          data: { deletedAt: null },
        });
      }
      return { success: true };
    }),

  permanentDelete: protectedProcedure
    .input(z.object({ uniqueId: z.number(), type: z.enum(['file', 'folder']) }))
    .mutation(async ({ ctx, input }) => {
      if (input.type === 'file') {
        const file = await ctx.db.fileManagerFile.findFirst({
          where: { uniqueId: input.uniqueId },
        });
        if (file) {
          const { getS3Key, deleteObject } = await import('@/lib/s3');
          const key = getS3Key(Number(ctx.session.user.id), file.uniqueId, file.basename ?? file.name ?? 'unknown');
          await deleteObject(key);
        }
        await ctx.db.fileManagerFile.delete({ where: { uniqueId: input.uniqueId } });
      } else {
        const files = await ctx.db.fileManagerFile.findMany({ where: { folderId: input.uniqueId } });
        const { getS3Key, deleteObject } = await import('@/lib/s3');
        for (const file of files) {
          const key = getS3Key(Number(ctx.session.user.id), file.uniqueId, file.basename ?? file.name ?? 'unknown');
          await deleteObject(key);
          await ctx.db.fileManagerFile.delete({ where: { uniqueId: file.uniqueId } });
        }
        await ctx.db.fileManagerFolder.delete({ where: { uniqueId: input.uniqueId } });
      }
      return { success: true };
    }),

  emptyTrash: protectedProcedure
    .input(z.object({}))
    .mutation(async ({ ctx }) => {
      const files = await ctx.db.fileManagerFile.findMany({
        where: { userId: Number(ctx.session.user.id), deletedAt: { not: null } },
      });
      const { getS3Key, deleteObject } = await import('@/lib/s3');
      for (const file of files) {
        const key = getS3Key(Number(ctx.session.user.id), file.uniqueId, file.basename ?? file.name ?? 'unknown');
        await deleteObject(key);
        await ctx.db.fileManagerFile.delete({ where: { uniqueId: file.uniqueId } });
      }
      await ctx.db.fileManagerFolder.deleteMany({
        where: { userId: Number(ctx.session.user.id), deletedAt: { not: null } },
      });
      return { success: true };
    }),

  // ─── Favourites ──────────────────────────────────────────────────
  toggleFavourite: protectedProcedure
    .input(z.object({ folderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.favouriteFolder.findUnique({
        where: {
          userId_folderUniqueId: {
            userId: Number(ctx.session.user.id),
            folderUniqueId: input.folderId,
          },
        },
      });
      if (existing) {
        await ctx.db.favouriteFolder.delete({
          where: {
            userId_folderUniqueId: {
              userId: Number(ctx.session.user.id),
              folderUniqueId: input.folderId,
            },
          },
        });
        return { favourited: false };
      }
      await ctx.db.favouriteFolder.create({
        data: {
          userId: Number(ctx.session.user.id),
          folderUniqueId: input.folderId,
        },
      });
      return { favourited: true };
    }),

  listFavourites: protectedProcedure.query(async ({ ctx }) => {
    const favourites = await ctx.db.favouriteFolder.findMany({
      where: { userId: Number(ctx.session.user.id) },
      include: { folder: true },
    });
    return favourites.map(f => f.folder);
  }),

  isFavourited: protectedProcedure
    .input(z.object({ folderId: z.number() }))
    .query(async ({ ctx, input }) => {
      const exists = await ctx.db.favouriteFolder.findUnique({
        where: {
          userId_folderUniqueId: {
            userId: Number(ctx.session.user.id),
            folderUniqueId: input.folderId,
          },
        },
      });
      return !!exists;
    }),

  // ─── Bulk Operations ─────────────────────────────────────────────
  bulkMove: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1).max(100),
      type: z.enum(['file', 'folder']),
      toFolderId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      for (const id of input.ids) {
        if (input.type === 'folder') {
          await ctx.db.fileManagerFolder.update({
            where: { uniqueId: id },
            data: { parentId: input.toFolderId },
          });
        } else {
          await ctx.db.fileManagerFile.update({
            where: { uniqueId: id },
            data: { folderId: input.toFolderId },
          });
        }
      }
      return { moved: input.ids.length };
    }),

  bulkDelete: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        uniqueId: z.number(),
        type: z.enum(['file', 'folder']),
      })).min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      for (const item of input.items) {
        if (item.type === 'folder') {
          await ctx.db.fileManagerFolder.update({
            where: { uniqueId: item.uniqueId },
            data: { deletedAt: now },
          });
        } else {
          await ctx.db.fileManagerFile.update({
            where: { uniqueId: item.uniqueId },
            data: { deletedAt: now },
          });
        }
      }
      return { deleted: input.items.length };
    }),

  // ─── Sharing ────────────────────────────────────────────────────
  createShare: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      type: z.enum(['file', 'folder']),
      permission: z.enum(['visitor', 'editor']).optional(),
      protected: z.boolean().optional(),
      password: z.string().optional(),
      expireIn: z.number().optional(), // hours
    }))
    .mutation(async ({ ctx, input }) => {
      const token = randomBytes(8).toString('hex').slice(0, 16);
      const share = await ctx.db.share.create({
        data: {
          userId: Number(ctx.session.user.id),
          token,
          itemId: input.itemId,
          type: input.type,
          permission: input.permission ?? 'visitor',
          protected: input.protected ?? false,
          password: input.password, // TODO: hash with bcrypt
          expireIn: input.expireIn,
        },
      });
      return { share, url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/s/${token}` };
    }),

  listShares: protectedProcedure.query(async ({ ctx }) => {
    const shares = await ctx.db.share.findMany({
      where: { userId: Number(ctx.session.user.id) },
      orderBy: { createdAt: 'desc' },
    });
    return shares;
  }),

  deleteShare: protectedProcedure
    .input(z.object({ shareId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.share.delete({
        where: { id: input.shareId, userId: Number(ctx.session.user.id) },
      });
      return { success: true };
    }),

  updateShare: protectedProcedure
    .input(z.object({
      shareId: z.number(),
      permission: z.enum(['visitor', 'editor']).optional(),
      protected: z.boolean().optional(),
      password: z.string().optional(),
      expireIn: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const share = await ctx.db.share.update({
        where: { id: input.shareId, userId: Number(ctx.session.user.id) },
        data: {
          ...(input.permission && { permission: input.permission }),
          ...(input.protected !== undefined && { protected: input.protected }),
          ...(input.password !== undefined && { password: input.password }),
          ...(input.expireIn !== undefined && { expireIn: input.expireIn }),
        },
      });
      return { share };
    }),

  getShareContent: publicProcedure
    .input(z.object({ token: z.string(), password: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const share = await ctx.db.share.findUnique({
        where: { token: input.token },
      });
      if (!share) throw new TRPCError({ code: 'NOT_FOUND', message: 'Share not found' });

      // Check expiration
      if (share.expireIn) {
        const expiresAt = new Date(share.createdAt);
        expiresAt.setHours(expiresAt.getHours() + share.expireIn);
        if (new Date() > expiresAt) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'This link has expired' });
        }
      }

      // Check password
      if (share.protected && share.password) {
        if (!input.password || input.password !== share.password) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Password required' });
        }
      }

      // Get content
      if (share.type === 'folder') {
        const folder = await ctx.db.fileManagerFolder.findUnique({
          where: { uniqueId: share.itemId },
        });
        const files = await ctx.db.fileManagerFile.findMany({
          where: { folderId: share.itemId, deletedAt: null },
        });
        const folders = await ctx.db.fileManagerFolder.findMany({
          where: { parentId: share.itemId, deletedAt: null },
        });
        return { share, folder, files, folders };
      } else {
        const file = await ctx.db.fileManagerFile.findUnique({
          where: { uniqueId: share.itemId },
        });
        return { share, file, files: file ? [file] : [], folders: [] };
      }
    }),

  getShareDownloadUrl: publicProcedure
    .input(z.object({ token: z.string(), fileId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const share = await ctx.db.share.findUnique({
        where: { token: input.token },
      });
      if (!share) throw new TRPCError({ code: 'NOT_FOUND', message: 'Share not found' });

      // Check expiration
      if (share.expireIn) {
        const expiresAt = new Date(share.createdAt);
        expiresAt.setHours(expiresAt.getHours() + share.expireIn);
        if (new Date() > expiresAt) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'This link has expired' });
        }
      }

      const fileId = input.fileId ?? share.itemId;
      const file = await ctx.db.fileManagerFile.findUnique({
        where: { uniqueId: fileId },
      });
      if (!file) throw new TRPCError({ code: 'NOT_FOUND', message: 'File not found' });

      const { getS3Key, getPresignedDownloadUrl } = await import('@/lib/s3');
      const key = getS3Key(file.userId ?? 0, file.uniqueId, file.basename ?? file.name ?? 'unknown');
      const url = await getPresignedDownloadUrl(key, 300);

      // Track download in traffic table
      await ctx.db.traffic.create({
        data: {
          userId: file.userId ?? 0,
          upload: 0,
          download: Number(file.filesize ?? '0'),
        },
      });

      return { url, name: file.name };
    }),

  // ─── Bulk Move ─────────────────────────────────────────────────
  moveItems: protectedProcedure
    .input(z.object({
      folderIds: z.array(z.number()).default([]),
      fileIds: z.array(z.number()).default([]),
      targetFolderId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Move folders
      if (input.folderIds.length > 0) {
        await ctx.db.fileManagerFolder.updateMany({
          where: { uniqueId: { in: input.folderIds } },
          data: { parentId: input.targetFolderId },
        });
      }

      // Move files
      if (input.fileIds.length > 0) {
        await ctx.db.fileManagerFile.updateMany({
          where: { uniqueId: { in: input.fileIds } },
          data: { folderId: input.targetFolderId },
        });
      }

      return { moved: input.folderIds.length + input.fileIds.length };
    }),

  // ─── Bulk Delete ───────────────────────────────────────────────
  deleteFiles: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      // Soft-delete files
      await ctx.db.fileManagerFile.updateMany({
        where: { uniqueId: { in: input.ids } },
        data: { deletedAt: new Date() },
      });

      // Soft-delete folders
      await ctx.db.fileManagerFolder.updateMany({
        where: { uniqueId: { in: input.ids } },
        data: { deletedAt: new Date() },
      });

      return { deleted: input.ids.length };
    }),

  // ─── File Versions ─────────────────────────────────────────────
  getVersions: protectedProcedure
    .input(z.object({ fileId: z.number() }))
    .query(async ({ ctx, input }) => {
      const versions = await ctx.db.fileVersion.findMany({
        where: { fileId: input.fileId },
        orderBy: { version: 'desc' },
      });
      return versions;
    }),

  createVersion: protectedProcedure
    .input(z.object({
      fileId: z.number(),
      basename: z.string().optional(),
      name: z.string().optional(),
      filesize: z.string().optional(),
      mimetype: z.string().optional(),
      s3Key: z.string().optional(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get current highest version
      const latest = await ctx.db.fileVersion.findFirst({
        where: { fileId: input.fileId },
        orderBy: { version: 'desc' },
      });
      const nextVersion = (latest?.version ?? 0) + 1;

      const version = await ctx.db.fileVersion.create({
        data: {
          fileId: input.fileId,
          version: nextVersion,
          basename: input.basename,
          name: input.name,
          filesize: input.filesize,
          mimetype: input.mimetype,
          s3Key: input.s3Key,
          comment: input.comment,
        },
      });

      return { version };
    }),

  restoreVersion: protectedProcedure
    .input(z.object({ versionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const version = await ctx.db.fileVersion.findUnique({
        where: { id: input.versionId },
      });
      if (!version) throw new TRPCError({ code: 'NOT_FOUND', message: 'Version not found' });

      // Restore file metadata from version
      await ctx.db.fileManagerFile.update({
        where: { uniqueId: version.fileId },
        data: {
          basename: version.basename ?? undefined,
          name: version.name ?? undefined,
          filesize: version.filesize ?? undefined,
          mimetype: version.mimetype ?? undefined,
        },
      });

      return { success: true };
    }),
});
