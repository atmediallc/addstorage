import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { rateLimit } from "@/lib/rate-limit";

export const usersRouter = createTRPCRouter({
  checkEmailAvailability: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .query(
      rateLimit({
        max: 10,
        windowMs: 15 * 60 * 1000, // 15 minutes
      }),
      async ({ input }) => {
        try {
          // Check if email exists in database
          const user = await db.user.findUnique({
            where: { email: input.email },
          });

          return {
            available: !user,
            message: user ? "Email is already taken" : "Email is available",
          };
        } catch (error) {
          console.error("Email availability check error:", error);
          throw new Error("Failed to check email availability");
        }
      }
    ),
});