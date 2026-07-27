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
  getOrCreateCustomer,
} from '@/lib/stripe';
import { db } from '@/server/db';
import { logAuditEvent } from '@/server/auth/audit';

export const billingRouter = router({
  // ─── Plans ───────────────────────────────────────────────────────
  getPlans: publicProcedure.query(async () => {
    return getActivePlans();
  }),

  // ─── Subscription ────────────────────────────────────────────────
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const userId = Number(ctx.session.user.id);
    const subscription = await db.subscription.findFirst({
      where: { userId, stripeStatus: { not: 'canceled' } },
      orderBy: { createdAt: 'desc' },
    });
    return subscription;
  }),

  // ─── Checkout ────────────────────────────────────────────────────
  checkout: protectedProcedure
    .input(z.object({ priceId: z.string(), planName: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.session.user.id);
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

      const session = await createCheckoutSession(
        user.stripeId || '',
        input.priceId,
        `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
        `${process.env.NEXT_PUBLIC_APP_URL}/billing`
      );
      return { url: session.url };
    }),

  // ─── Portal ──────────────────────────────────────────────────────
  portal: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = Number(ctx.session.user.id);
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !user.stripeId) throw new TRPCError({ code: 'NOT_FOUND', message: 'No Stripe customer' });

    const session = await createPortalSession(
      user.stripeId,
      `${process.env.NEXT_PUBLIC_APP_URL}/settings`
    );
    return { url: session.url };
  }),

  // ─── Payment Methods ─────────────────────────────────────────────
  addPaymentMethod: protectedProcedure.query(async ({ ctx }) => {
    const userId = Number(ctx.session.user.id);
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !user.stripeId) return [];
    return getCustomerPaymentMethods(user.stripeId);
  }),

  setDefaultPaymentMethod: protectedProcedure
    .input(z.object({ paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = Number(ctx.session.user.id);
      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user || !user.stripeId) throw new TRPCError({ code: 'NOT_FOUND', message: 'No Stripe customer' });

      await stripe.paymentMethods.attach(input.paymentMethodId, {
        customer: user.stripeId,
      });
      await stripe.customers.update(user.stripeId, {
        invoice_settings: { default_payment_method: input.paymentMethodId },
      });
      return { success: true };
    }),

  deletePaymentMethod: protectedProcedure
    .input(z.object({ paymentMethodId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await deletePaymentMethod(input.paymentMethodId);
      return { success: true };
    }),

  // ─── Cancel Subscription ─────────────────────────────────────────
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = Number(ctx.session.user.id);

    const subscription = await db.subscription.findFirst({
      where: { userId, stripeStatus: { notIn: ['canceled', 'incomplete_expired'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No active subscription found' });
    }

    // Cancel on Stripe (at period end)
    const updated = await stripe.subscriptions.update(subscription.stripeId, {
      cancel_at_period_end: true,
    });

    // Update local DB
    await db.subscription.update({
      where: { id: subscription.id },
      data: {
        stripeStatus: 'canceled',
        endsAt: new Date((updated as any).current_period_end * 1000),
      },
    });

    await logAuditEvent(userId, 'subscription.cancel', 'subscription', subscription.id);

    return { success: true };
  }),

  // ─── Resume Subscription ─────────────────────────────────────────
  resumeSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = Number(ctx.session.user.id);

    const subscription = await db.subscription.findFirst({
      where: { userId, stripeStatus: 'canceled' },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No canceled subscription found' });
    }

    // Check if subscription hasn't ended yet
    if (subscription.endsAt && new Date(subscription.endsAt) < new Date()) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Subscription has already ended' });
    }

    // Resume on Stripe
    await stripe.subscriptions.update(subscription.stripeId, {
      cancel_at_period_end: false,
    });

    // Update local DB
    await db.subscription.update({
      where: { id: subscription.id },
      data: {
        stripeStatus: 'active',
        endsAt: null,
      },
    });

    await logAuditEvent(userId, 'subscription.resume', 'subscription', subscription.id);

    return { success: true };
  }),

  // ─── Setup Intent ────────────────────────────────────────────────
  getSetupIntent: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = Number(ctx.session.user.id);
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });

    // Ensure Stripe customer exists
    let customerId = user.stripeId;
    if (!customerId) {
      const customer = await getOrCreateCustomer(userId, user.email, user.name);
      customerId = customer.id;
      await db.user.update({ where: { id: userId }, data: { stripeId: customerId } });
    }

    // Create SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });

    return { clientSecret: setupIntent.client_secret };
  }),

  // ─── Invoices ────────────────────────────────────────────────────
  getInvoices: protectedProcedure.query(async ({ ctx }) => {
    const userId = Number(ctx.session.user.id);
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !user.stripeId) return [];
    return getCustomerInvoices(user.stripeId);
  }),

  getUserInvoices: protectedProcedure.query(async ({ ctx }) => {
    const userId = Number(ctx.session.user.id);
    const invoices = await db.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return invoices;
  }),

  getInvoicePdf: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findFirst({
        where: {
          token: input.token,
          userId: Number(ctx.session.user.id),
        },
      });
      if (!invoice) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' });

      const { getPresignedDownloadUrl } = await import('@/lib/s3');
      const url = await getPresignedDownloadUrl(`invoices/${invoice.token}.pdf`, 3600);
      return { url };
    }),
});
