import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { filesRouter } from "@/server/api/routers/files";
import { i18nRouter } from "@/server/api/routers/i18n";
import { contactRouter } from "@/server/api/routers/contact";
import { cmsRouter } from "@/server/api/routers/cms";
import { sharesRouter } from "@/server/api/routers/shares";
import { emojisRouter } from "@/server/api/routers/emojis";
import { usersRouter } from "@/server/api/routers/users";
import { invoicesRouter } from "@/server/api/routers/invoices";
import { adminRouter } from "@/server/api/routers/admin";
import { setupRouter } from "@/server/api/routers/setup";
import { languagesRouter } from "@/server/api/routers/languages";
import { searchRouter } from "@/server/api/routers/search";
import { webhooksRouter } from "@/server/api/routers/webhooks";
import { deployRouter } from "@/server/api/routers/deploy";
import { analyticsRouter } from "@/server/api/routers/analytics";
import { notificationsRouter } from "@/server/api/routers/notifications";
import { db } from "@/server/db";
import { unstable_cache } from "next/cache";

export const appRouter = createTRPCRouter({
  files: filesRouter,
  i18n: i18nRouter,
  contact: contactRouter,
  cms: cmsRouter,
  shares: sharesRouter,
  emojis: emojisRouter,
  users: usersRouter,
  invoices: invoicesRouter,
  admin: adminRouter,
  setup: setupRouter,
  languages: languagesRouter,
  search: searchRouter,
  webhooks: webhooksRouter,
  deploy: deployRouter,
  analytics: analyticsRouter,
  notifications: notificationsRouter,

  // Health check endpoint
  health: publicProcedure
    .query(() => {
      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || "unknown",
      };
    }),

  // API documentation endpoint
  docs: publicProcedure
    .query(() => {
      return {
        message: "API Documentation",
        endpoints: Object.keys(appRouter._def.procedures).filter(
          (endpoint) => !["health", "docs", "status"].includes(endpoint)
        ),
      };
    }),

  // System status endpoint
  status: publicProcedure
    .query(
      unstable_cache(
        async () => {
          // Check database connection
          const dbStatus = await db.$queryRaw`SELECT 1`;

          // Check cache status
          const cacheStatus = await unstable_cache(
            () => Promise.resolve(true),
            ["system", "cache"],
            { revalidate: 60 }
          )();

          return {
            database: dbStatus ? "connected" : "disconnected",
            cache: cacheStatus ? "available" : "unavailable",
            timestamp: new Date().toISOString(),
          };
        },
        ["system", "status"],
        {
          tags: ["system"],
          revalidate: 60, // Cache for 1 minute
        }
      )
    ),
});

export type AppRouter = typeof appRouter;