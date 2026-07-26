import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { queueJob } from "@/lib/queue";

export const searchRouter = createTRPCRouter({
  reindexService: protectedProcedure
    .mutation(async () => {
      try {
        // Queue the reindexing job
        const job = await queueJob({
          type: "reindex",
          data: {
            // Add any necessary data for the job
            // For example, you might want to specify which items to reindex
          },
        });

        return {
          success: true,
          message: "Reindexing job queued successfully",
          jobId: job.id,
        };
      } catch (error) {
        console.error("Failed to queue reindex job:", error);
        throw new Error("Failed to initiate reindexing process");
      }
    }),
});