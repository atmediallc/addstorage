import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { exec } from "child_process";
import { promisify } from "util";
import crypto from "crypto";

const execAsync = promisify(exec);

export const deployRouter = createTRPCRouter({
  handleGithubWebhook: publicProcedure
    .input(z.object({ payload: z.string(), signature: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Verify the webhook signature
        const secret = process.env.GITHUB_WEBHOOK_SECRET!;
        const signature = crypto
          .createHmac("sha256", secret)
          .update(input.payload)
          .digest("hex");

        if (`sha256=${signature}` !== input.signature) {
          throw new Error("Invalid webhook signature");
        }

        // Parse the payload
        const payload = JSON.parse(input.payload);

        // Check if this is a push event to the main branch
        if (
          payload.ref === "refs/heads/main" &&
          payload.repository.full_name === process.env.GITHUB_REPO
        ) {
          // Run the deployment script
          const { stdout, stderr } = await execAsync(
            "bash scripts/deploy.sh",
            { cwd: process.cwd() }
          );

          if (stderr) {
            console.error("Deployment error:", stderr);
            throw new Error("Deployment failed");
          }

          return {
            success: true,
            message: "Deployment initiated successfully",
            output: stdout,
          };
        }

        return {
          success: true,
          message: "Webhook received but no deployment action taken",
        };
      } catch (error) {
        console.error("Deployment error:", error);
        throw new Error("Failed to process deployment");
      }
    }),
});