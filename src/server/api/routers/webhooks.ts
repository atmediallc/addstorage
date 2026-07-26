import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export const webhooksRouter = createTRPCRouter({
  handleStripeWebhook: publicProcedure
    .input(z.object({ payload: z.string(), signature: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Verify the webhook signature
        const event = stripe.webhooks.constructEvent(
          input.payload,
          input.signature,
          process.env.STRIPE_WEBHOOK_SECRET!
        );

        // Handle different event types
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            if (session.subscription) {
              await db.subscription.update({
                where: { stripeId: session.subscription.toString() },
                data: {
                  stripeStatus: "active",
                  trialEndsAt: session.subscription_details?.trial_end
                    ? new Date(session.subscription_details.trial_end * 1000)
                    : null,
                },
              });
            }
            break;
          }

          case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;
            await db.subscription.update({
              where: { stripeId: subscription.id },
              data: {
                stripeStatus: subscription.status,
                trialEndsAt: subscription.trial_end
                  ? new Date(subscription.trial_end * 1000)
                  : null,
                endsAt: subscription.cancel_at
                  ? new Date(subscription.cancel_at * 1000)
                  : null,
              },
            });
            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            await db.subscription.update({
              where: { stripeId: subscription.id },
              data: {
                stripeStatus: "canceled",
                endsAt: subscription.cancel_at
                  ? new Date(subscription.cancel_at * 1000)
                  : null,
              },
            });
            break;
          }

          case "invoice.payment_succeeded": {
            const invoice = event.data.object as Stripe.Invoice;
            await db.invoice.update({
              where: { token: invoice.id },
              data: {
                status: "paid",
                paidAt: new Date(invoice.status_transitions?.paid_at * 1000),
              },
            });
            break;
          }

          default:
            console.log(`Unhandled event type: ${event.type}`);
        }

        return { success: true, eventType: event.type };
      } catch (error) {
        console.error("Webhook error:", error);
        throw new Error("Failed to process webhook");
      }
    }),
});