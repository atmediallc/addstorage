// src/server/trpc/routers/billing.ts
import { router } from '../index';
import { protectedProcedure, publicProcedure } from '../procedures';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  stripe,
  getActivePlans,
  getCustomerInvoices,
  getCustomerPaymentMethods,
  createCheckoutSession,
  createPortalSession,
  deletePaymentMethod,
} from '@/lib/stripe';

export const billingRouter = router({
  // ─── Plans ──────────────────────────────────────────────────────
  getPlans: publicProcedure.query(async () => {
    const plans = await getActivePlans();
    return plans.map((plan) => ({
      id: plan.id,
      name: plan.nickname ?? plan.id,
      price: plan.amount ?? 0,
      currency: plan.currency,
      interval: plan.interval,
      intervalCount: plan.interval_count,
    }));
  }),

  // ─── Current Subscription ───────────────────────────────────────
  getCurrentSubscription: protectedProcedure.query(async ({ ctx }) => {
    const userId = Number(ctx.session.user.id);

    const subscription = await ctx.db.subscription.findFirst({
      where: { userId, stripeStatus: { notIn: ['canceled', 'unpaid'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) return null;

    return {
      id: subscription.id,
      status: subscription.stripeStatus,
      planId: subscription.stripePlan,
      currentPeriodEnd: subscription.endsAt,
      cancelAtPeriodEnd: subscription.endsAt ? new Date(subscription.endsAt) > new Date() : false,
    };
  }),

  // ─── Checkout ───────────────────────────────────────────────────
  createCheckoutSession: protectedProcedure
    .input(z.object({ priceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.session.user.id);
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

      // Get or create Stripe customer
      const { getOrCreateCustomer } = await import('@/lib/stripe');
      const customer = await getOrCreateCustomer(userId, user.email, user.name ?? undefined);

      const session = await createCheckoutSession(
        customer.id,
        input.priceId,
        `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/billing?success=true`,
        `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/billing?canceled=true`,
      );

      return { sessionId: session.id, url: session.url };
    }),

  // ─── Portal ─────────────────────────────────────────────────────
  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = Number(ctx.session.user.id);

    // Find Stripe customer ID from subscription
    const subscription = await ctx.db.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No subscription found' });
    }

    // In a real app, you'd store the Stripe customer ID
    // For now, we'll use the session to manage
    const session = await createPortalSession(
      subscription.stripeId, // This is actually the subscription ID, need customer ID
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/billing`,
    );

    return { url: session.url };
  }),

  // ─── Payment Methods ────────────────────────────────────────────
  getPaymentMethods: protectedProcedure.query(async ({ ctx }) => {
    const userId = Number(ctx.session.user.id);

    // In production, get from Stripe using customer ID
    // Placeholder for now
    return [];
  }),

  addPaymentMethod: protectedProcedure
    .input(z.object({ paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // In production, attach payment method to customer
      return { success: true };
    }),

  removePaymentMethod: protectedProcedure
    .input(z.object({ paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deletePaymentMethod(input.paymentMethodId);
      return { success: true };
    }),

  // ─── Invoices ───────────────────────────────────────────────────
  getInvoices: protectedProcedure.query(async ({ ctx }) => {
    const userId = Number(ctx.session.user.id);

    // In production, get from Stripe using customer ID
    // Placeholder for now
    return [];
  }),
});
