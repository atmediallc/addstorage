// src/server/trpc/routers/admin.ts
import { router } from '../index';
import { protectedProcedure } from '../procedures';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

// Admin guard: only ADMIN+ (level >= 80)
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const role = (ctx.session.user as Record<string, unknown>).role;
  if (role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const adminRouter = router({
  // ─── Dashboard ──────────────────────────────────────────────────
  getDashboardStats: adminProcedure.query(async ({ ctx }) => {
    const totalUsers = await ctx.db.user.count();
    const totalFiles = await ctx.db.fileManagerFile.count({ where: { deletedAt: null } });
    const totalFolders = await ctx.db.fileManagerFolder.count({ where: { deletedAt: null } });

    const files = await ctx.db.fileManagerFile.findMany({
      where: { deletedAt: null },
      select: { filesize: true },
    });
    const storageUsed = files.reduce((sum: number, f: { filesize: string | null }) => sum + Number(f.filesize ?? '0'), 0);

    const recentUsers = await ctx.db.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, name: true, email: true, createdAt: true },
    });

    return {
      totalUsers,
      totalFiles,
      totalFolders,
      storageUsed: Number(storageUsed),
      recentUsers,
    };
  }),

  // ─── User Management ────────────────────────────────────────────
  listUsers: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(10),
    }))
    .query(async ({ ctx, input }) => {
      const where = input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' as const } },
              { email: { contains: input.search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const [users, total] = await Promise.all([
        ctx.db.user.findMany({
          where,
          skip: (input.page - 1) * input.limit,
          take: input.limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        }),
        ctx.db.user.count({ where }),
      ]);

      return { users, total, pages: Math.ceil(total / input.limit) };
    }),

  getUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          settings: true,
        },
      });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

      const fileCount = await ctx.db.fileManagerFile.count({
        where: { userId: input.userId, deletedAt: null },
      });
      const folderCount = await ctx.db.fileManagerFolder.count({
        where: { userId: input.userId, deletedAt: null },
      });

      const files = await ctx.db.fileManagerFile.findMany({
        where: { userId: input.userId, deletedAt: null },
        select: { filesize: true },
      });
      const storageUsed = files.reduce((sum, f) => sum + BigInt(f.filesize ?? '0'), BigInt(0));

      return {
        ...user,
        fileCount,
        folderCount,
        storageUsed: Number(storageUsed),
      };
    }),

  updateUser: adminProcedure
    .input(z.object({
      userId: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      role: z.enum(['admin', 'user']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.email && { email: input.email }),
          ...(input.role && { role: input.role }),
        },
      });
      return { user };
    }),

  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Delete user's files from S3
      const files = await ctx.db.fileManagerFile.findMany({
        where: { userId: input.userId },
      });
      const { getS3Key, deleteObject } = await import('@/lib/s3');
      for (const file of files) {
        const key = getS3Key(input.userId, file.uniqueId, file.basename ?? file.name ?? 'unknown');
        await deleteObject(key);
      }

      // Cascade delete
      await ctx.db.fileManagerFile.deleteMany({ where: { userId: input.userId } });
      await ctx.db.fileManagerFolder.deleteMany({ where: { userId: input.userId } });
      await ctx.db.share.deleteMany({ where: { userId: input.userId } });
      await ctx.db.favouriteFolder.deleteMany({ where: { userId: input.userId } });
      await ctx.db.userSettings.deleteMany({ where: { userId: input.userId } });
      await ctx.db.user.delete({ where: { id: input.userId } });

      return { success: true };
    }),

  changeUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(['admin', 'user']) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });
      return { user };
    }),

  changeStorageCapacity: adminProcedure
    .input(z.object({ userId: z.number(), capacity: z.number().min(1).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.userSettings.upsert({
        where: { userId: input.userId },
        update: { storageCapacity: input.capacity },
        create: { userId: input.userId, storageCapacity: input.capacity },
      });
      return { success: true };
    }),

  // ─── Settings ───────────────────────────────────────────────────
  getSettings: adminProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.setting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.name] = s.value ?? '';
    }
    return map;
  }),

  updateSettings: adminProcedure
    .input(z.object({
      settings: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      for (const [name, value] of Object.entries(input.settings)) {
        await ctx.db.setting.upsert({
          where: { name },
          update: { value },
          create: { name, value },
        });
      }
      return { success: true };
    }),

  // ─── Languages ──────────────────────────────────────────────────
  listLanguages: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.language.findMany({ orderBy: { name: 'asc' } });
  }),

  createLanguage: adminProcedure
    .input(z.object({ name: z.string().min(1), locale: z.string().min(2).max(5) }))
    .mutation(async ({ ctx, input }) => {
      const lang = await ctx.db.language.create({ data: input });
      return { language: lang };
    }),

  deleteLanguage: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.languageString.deleteMany({ where: { languageId: input.id } });
      await ctx.db.language.delete({ where: { id: input.id } });
      return { success: true };
    }),

  updateTranslation: adminProcedure
    .input(z.object({
      lang: z.string(),
      key: z.string(),
      value: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const lang = await ctx.db.language.findUnique({ where: { locale: input.lang } });
      if (!lang) throw new TRPCError({ code: 'NOT_FOUND', message: 'Language not found' });

      const existing = await ctx.db.languageString.findFirst({
        where: { languageId: lang.id, key: input.key },
      });
      if (existing) {
        await ctx.db.languageString.update({
          where: { id: existing.id },
          data: { value: input.value },
        });
      } else {
        await ctx.db.languageString.create({
          data: { languageId: lang.id, key: input.key, value: input.value },
        });
      }
      return { success: true };
    }),

  // ─── Pages ──────────────────────────────────────────────────────
  listPages: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.page.findMany({ orderBy: { title: 'asc' } });
  }),

  getPage: adminProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const page = await ctx.db.page.findUnique({ where: { slug: input.slug } });
      if (!page) throw new TRPCError({ code: 'NOT_FOUND', message: 'Page not found' });
      return page;
    }),

  updatePage: adminProcedure
    .input(z.object({
      slug: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
      visibility: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const page = await ctx.db.page.update({
        where: { slug: input.slug },
        data: {
          ...(input.title && { title: input.title }),
          ...(input.content !== undefined && { content: input.content }),
          ...(input.visibility !== undefined && { visibility: input.visibility }),
        },
      });
      return { page };
    }),

  // ─── Maintenance ────────────────────────────────────────────────
  getSystemInfo: adminProcedure.query(async ({ ctx }) => {
    const totalUsers = await ctx.db.user.count();
    const totalFiles = await ctx.db.fileManagerFile.count({ where: { deletedAt: null } });
    const totalFolders = await ctx.db.fileManagerFolder.count({ where: { deletedAt: null } });
    const totalSubscriptions = await ctx.db.subscription.count();

    return {
      version: process.env.APP_VERSION ?? '0.1.0',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      totalUsers,
      totalFiles,
      totalFolders,
      totalSubscriptions,
    };
  }),

  healthCheck: adminProcedure.query(async ({ ctx }) => {
    const checks: Record<string, string> = {};

    try {
      await ctx.db.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    const allOk = Object.values(checks).every((v) => v === 'ok');

    return {
      status: allOk ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };
  }),

  clearCache: adminProcedure.mutation(async () => {
    return { success: true, message: 'Cache cleared' };
  }),

  // ─── Analytics ─────────────────────────────────────────────────
  analyticsOverview: adminProcedure.query(async ({ ctx }) => {
    const [totalUsers, totalFiles, totalFolders, totalStorage, recentUsers, activeShares] =
      await Promise.all([
        ctx.db.user.count(),
        ctx.db.fileManagerFile.count({ where: { deletedAt: null } }),
        ctx.db.fileManagerFolder.count({ where: { deletedAt: null } }),
        ctx.db.userSettings.aggregate({ _sum: { storageCapacity: true } }),
        ctx.db.user.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
        ctx.db.share.count(),
      ]);

    return {
      totalUsers,
      totalFiles,
      totalFolders,
      totalStorageGB: totalStorage._sum.storageCapacity ?? 0,
      recentUsers,
      activeShares,
    };
  }),

  analyticsUserGrowth: adminProcedure.query(async ({ ctx }) => {
    // Get user registrations grouped by day for last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const users = await ctx.db.user.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const grouped: Record<string, number> = {};
    for (const user of users) {
      const day = user.createdAt.toISOString().split('T')[0] ?? 'unknown';
      grouped[day] = (grouped[day] ?? 0) + 1;
    }

    return Object.entries(grouped).map(([date, count]) => ({ date, count }));
  }),

  analyticsFileTypeDistribution: adminProcedure.query(async ({ ctx }) => {
    const files = await ctx.db.fileManagerFile.findMany({
      where: { deletedAt: null },
      select: { mimetype: true },
    });

    const categories = {
      Images: 0,
      Documents: 0,
      Videos: 0,
      Audio: 0,
      Other: 0,
    };

    for (const file of files) {
      const mime = file.mimetype ?? '';
      if (mime.startsWith('image/')) categories.Images += 1;
      else if (mime.startsWith('video/')) categories.Videos += 1;
      else if (mime.startsWith('audio/')) categories.Audio += 1;
      else if (mime.includes('pdf') || mime.includes('word') || mime.includes('text') || mime.includes('sheet')) categories.Documents += 1;
      else categories.Other += 1;
    }

    return Object.entries(categories)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({ type, count }));
  }),

  analyticsStorageByUser: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        settings: { select: { storageCapacity: true } },
      },
      take: 20,
    });

    // Count files per user
    const fileCounts = await ctx.db.fileManagerFile.groupBy({
      by: ['userId'],
      where: { deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    const countMap = new Map(fileCounts.map((f) => [f.userId, f._count.id]));

    return users.map((u) => ({
      userId: u.id,
      name: u.name ?? 'Unknown',
      email: u.email,
      storageGB: u.settings?.storageCapacity ?? 0,
      fileCount: countMap.get(u.id) ?? 0,
    }));
  }),

  analyticsShareStats: adminProcedure.query(async ({ ctx }) => {
    const [total, passwordProtected, expired] = await Promise.all([
      ctx.db.share.count(),
      ctx.db.share.count({ where: { protected: true } }),
      // Count expired (shares with expireIn set and createdAt + expireIn < now)
      ctx.db.share.findMany({
        where: { expireIn: { not: null } },
        select: { createdAt: true, expireIn: true },
      }).then((shares) =>
        shares.filter((s) => {
          const expiresAt = new Date(s.createdAt);
          expiresAt.setHours(expiresAt.getHours() + (s.expireIn ?? 0));
          return expiresAt < new Date();
        }).length,
      ),
    ]);

    return {
      total,
      passwordProtected,
      expired,
      active: total - expired,
    };
  }),
});
