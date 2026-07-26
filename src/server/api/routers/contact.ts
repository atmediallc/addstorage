import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export const contactRouter = createTRPCRouter({
  submitForm: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        message: z.string().min(1),
      })
    )
    .mutation(
      rateLimit({
        max: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
      }),
      async ({ input }) => {
        try {
          // Save contact form submission to database
          const submission = await db.contactForm.create({
            data: {
              name: input.name,
              email: input.email,
              message: input.message,
            },
          });

          // Send email notification
          await sendEmail({
            to: process.env.ADMIN_EMAIL,
            subject: `New Contact Form Submission from ${input.name}`,
            text: `Name: ${input.name}\nEmail: ${input.email}\nMessage: ${input.message}`,
          });

          return { success: true, submissionId: submission.id };
        } catch (error) {
          console.error("Contact form submission error:", error);
          throw new Error("Failed to submit contact form");
        }
      }
    ),
});