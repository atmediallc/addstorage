// src/server/trpc/routers/user.ts
import { router } from '../index';
import { protectedProcedure } from '../procedures';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

export const userRouter = router({
  // ─── Profile ────────────────────────────────────────────────────
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: Number(ctx.session.user.id) },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        createdAt: true,
        settings: true,
      },
    });
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    return user;
  }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: Number(ctx.session.user.id) },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.email && { email: input.email }),
        },
      });
      return { user };
    }),

  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
    }))
    .mutation(async ({ ctx, input }) => {
      // Note: Better Auth handles password verification
      // This is a placeholder — actual implementation uses Better Auth's changePassword
      return { success: true };
    }),

  uploadAvatar: protectedProcedure
    .input(z.object({ avatarUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: Number(ctx.session.user.id) },
        data: { avatar: input.avatarUrl },
      });
      return { user };
    }),

  // ─── Storage ────────────────────────────────────────────────────
  getStorageDetails: protectedProcedure.query(async ({ ctx }) => {
    const userId = Number(ctx.session.user.id);

    const settings = await ctx.db.userSettings.findUnique({
      where: { userId },
    });
    const capacity = settings?.storageCapacity ?? 5;

    const files = await ctx.db.fileManagerFile.findMany({
      where: { userId, deletedAt: null },
      select: { filesize: true, mimetype: true },
    });

    const totalUsed = files.reduce((sum: number, f: { filesize: string | null }) => sum + Number(f.filesize ?? '0'), 0);

    // Breakdown by type
    const breakdown: { images: number; documents: number; videos: number; other: number } = {
      images: 0,
      documents: 0,
      videos: 0,
      other: 0,
    };

    for (const file of files) {
      const mime = file.mimetype ?? '';
      const size = Number(file.filesize ?? '0');
      if (mime.startsWith('image/')) breakdown.images += size;
      else if (mime.startsWith('video/')) breakdown.videos += size;
      else if (
        mime.includes('pdf') ||
        mime.includes('document') ||
        mime.includes('text') ||
        mime.includes('spreadsheet') ||
        mime.includes('presentation')
      ) {
        breakdown.documents += size;
      } else {
        breakdown.other += size;
      }
    }

    return {
      used: totalUsed,
      capacity,
      capacityBytes: capacity * 1024 * 1024 * 1024,
      breakdown,
      fileCount: files.length,
    };
  }),
});
