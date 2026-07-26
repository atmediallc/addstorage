import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { getS3Client } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { unstable_cache } from "next/cache";

export const invoicesRouter = createTRPCRouter({
  getInvoicePdf: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(
      unstable_cache(
        async ({ input }) => {
          // Get invoice from database
          const invoice = await db.invoice.findUnique({
            where: { token: input.token },
          });

          if (!invoice) {
            throw new Error("Invoice not found");
          }

          // Generate a presigned URL for the PDF
          const s3 = getS3Client();
          const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: `invoices/${invoice.token}.pdf`,
          });

          const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

          return { url };
        },
        ["invoices", "pdf", "token"],
        {
          tags: ["invoices"],
          revalidate: 3600, // Cache for 1 hour
        }
      )
    ),
});