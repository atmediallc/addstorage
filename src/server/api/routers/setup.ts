import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { sendEmail } from "@/lib/email";
import { generateVerificationToken } from "@/lib/auth";

export const setupRouter = createTRPCRouter({
  getSetupStatus: protectedProcedure
    .query(async () => {
      // Check if setup is complete
      const settings = await db.setting.findMany({
        where: {
          name: {
            in: [
              "app_name",
              "app_url",
              "admin_email",
              "mail_driver",
              "mail_host",
              "mail_port",
              "mail_username",
              "mail_password",
              "mail_encryption",
            ],
          },
        },
      });

      const requiredSettings = [
        "app_name",
        "app_url",
        "admin_email",
        "mail_driver",
        "mail_host",
        "mail_port",
        "mail_username",
        "mail_password",
        "mail_encryption",
      ];

      const completedSettings = settings.map((s) => s.name);
      const missingSettings = requiredSettings.filter(
        (s) => !completedSettings.includes(s)
      );

      return {
        isComplete: missingSettings.length === 0,
        completedSettings,
        missingSettings,
        progress: Math.round(
          ((requiredSettings.length - missingSettings.length) /
            requiredSettings.length) *
            100
        ),
      };
    }),

  completeSetup: protectedProcedure
    .input(
      z.object({
        appName: z.string(),
        appUrl: z.string().url(),
        adminEmail: z.string().email(),
        mailDriver: z.string(),
        mailHost: z.string(),
        mailPort: z.number(),
        mailUsername: z.string(),
        mailPassword: z.string(),
        mailEncryption: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Generate verification token
      const token = generateVerificationToken();

      // Save setup configuration
      await db.setting.createMany({
        data: [
          { name: "app_name", value: input.appName },
          { name: "app_url", value: input.appUrl },
          { name: "admin_email", value: input.adminEmail },
          { name: "mail_driver", value: input.mailDriver },
          { name: "mail_host", value: input.mailHost },
          { name: "mail_port", value: input.mailPort.toString() },
          { name: "mail_username", value: input.mailUsername },
          { name: "mail_password", value: input.mailPassword },
          { name: "mail_encryption", value: input.mailEncryption },
          { name: "admin_email_verified", value: "false" },
          { name: "email_verification_token", value: token },
        ],
        skipDuplicates: true,
      });

      // Send verification email
      await sendEmail({
        to: input.adminEmail,
        subject: "Verify your email address",
        text: `Please verify your email by clicking this link: ${process.env.NEXTAUTH_URL}/verify-email?token=${token}`,
      });

      return { success: true, message: "Verification email sent" };
    }),
});