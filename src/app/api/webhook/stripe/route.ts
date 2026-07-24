// src/app/api/webhook/stripe/route.ts
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/server/db';
import { logAuditEvent } from '@/server/auth/audit';

export const runtime = 'nodejs';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const DEFAULT_STORAGE_GB = 5;

// ─── Helpers ────────────────────────────────────────────────────

/** Look up local User by Stripe customer id, then find-or-create Subscription. */
async function upsertSubscription(
  userId: number,
  sub: {
    id: string;
    status: string;
    items: { data: Array<{ price: { id: string; metadata: Record<string, string> }; quantity: number | null }> };
    trial_end: number | null;
    current_period_end: number | null;
    cancel_at_period_end: boolean;
  },
) {
  const plan = sub.items.data[0]?.price?.id ?? null;
  const storageGB = parseStorageFromMetadata(sub.items.data[0]?.price?.metadata) ?? DEFAULT_STORAGE_GB;

  const subscription = await db.subscription.upsert({
    where: { stripeId: sub.id },
    create: {
      userId,
      name: sub.status,
      stripeId: sub.id,
      stripeStatus: sub.status,
      stripePlan: plan,
      quantity: sub.items.data[0]?.quantity ?? 1,
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      endsAt: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
    },
    update: {
      name: sub.status,
      stripeStatus: sub.status,
      stripePlan: plan,
      quantity: sub.items.data[0]?.quantity ?? 1,
      trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      endsAt: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
    },
  });

  // Sync subscription items
  for (const item of sub.items.data) {
    const itemStorage = parseStorageFromMetadata(item.price.metadata) ?? 0;
    const itemPlan = item.price.id;
    const itemQty = item.quantity ?? 1;

    await db.subscriptionItem.upsert({
      where: { subscriptionId_stripePlan: { subscriptionId: subscription.id, stripePlan: itemPlan } },
      create: { subscriptionId: subscription.id, stripeId: item.price.id, stripePlan: itemPlan, quantity: itemQty },
      update: { stripeId: item.price.id, quantity: itemQty },
    });
  }

  // Update user storage capacity
  await updateUserStorage(userId, storageGB);

  return subscription;
}

/** Parse storage capacity from Stripe price metadata (expects "storage_gb" key). */
function parseStorageFromMetadata(metadata: Record<string, string> | undefined): number | null {
  if (!metadata) return null;
  const val = metadata['storage_gb'] ?? metadata['storage'];
  const num = Number(val);
  return Number.isFinite(num) && num > 0 ? num : null;
}

/** Set UserSettings.storageCapacity, creating settings row if needed. */
async function updateUserStorage(userId: number, storageGB: number) {
  await db.userSettings.upsert({
    where: { userId },
    create: { userId, storageCapacity: storageGB },
    update: { storageCapacity: storageGB },
  });
}

/** Find local userId by Stripe customer id. */
async function getUserIdByStripeCustomer(stripeCustomerId: string): Promise<number | null> {
  const user = await db.user.findUnique({ where: { stripeId: stripeCustomerId }, select: { id: true } });
  return user?.id ?? null;
}

// ─── Event Handlers ─────────────────────────────────────────────

async function handleCheckoutSessionCompleted(session: any) {
  const customerId = session.customer as string;
  const userId = await getUserIdByStripeCustomer(customerId);
  if (!userId) {
    console.error('[stripe-webhook] checkout.session.completed: no local user for customer', customerId);
    return;
  }

  const subId = session.subscription as string | null;
  if (subId) {
    const sub = await stripe.subscriptions.retrieve(subId);
    await upsertSubscription(userId, sub as any);
  }

  await logAuditEvent(userId, 'subscription.created' as any, 'subscription', undefined, {
    stripeSessionId: session.id,
    stripeCustomerId: customerId,
    paymentStatus: session.payment_status,
  });
}

async function handleSubscriptionCreated(subscription: any) {
  const customerId = subscription.customer as string;
  const userId = await getUserIdByStripeCustomer(customerId);
  if (!userId) {
    console.error('[stripe-webhook] customer.subscription.created: no local user for customer', customerId);
    return;
  }

  await upsertSubscription(userId, subscription);

  await logAuditEvent(userId, 'subscription.created' as any, 'subscription', undefined, {
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
  });
}

async function handleSubscriptionUpdated(subscription: any) {
  const customerId = subscription.customer as string;
  const userId = await getUserIdByStripeCustomer(customerId);
  if (!userId) {
    console.error('[stripe-webhook] customer.subscription.updated: no local user for customer', customerId);
    return;
  }

  await upsertSubscription(userId, subscription);

  await logAuditEvent(userId, 'subscription.updated' as any, 'subscription', undefined, {
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
  });
}

async function handleSubscriptionDeleted(subscription: any) {
  const customerId = subscription.customer as string;
  const userId = await getUserIdByStripeCustomer(customerId);
  if (!userId) {
    console.error('[stripe-webhook] customer.subscription.deleted: no local user for customer', customerId);
    return;
  }

  await db.subscription.updateMany({
    where: { stripeId: subscription.id },
    data: {
      stripeStatus: 'canceled',
      endsAt: new Date(),
    },
  });

  // Reset to default storage
  await updateUserStorage(userId, DEFAULT_STORAGE_GB);

  await logAuditEvent(userId, 'subscription.deleted' as any, 'subscription', undefined, {
    stripeSubscriptionId: subscription.id,
  });
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  const customerId = invoice.customer as string;
  const userId = await getUserIdByStripeCustomer(customerId);
  if (!userId) return;

  await logAuditEvent(userId, 'invoice.payment_succeeded' as any, 'invoice', undefined, {
    stripeInvoiceId: invoice.id,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    subscriptionId: invoice.subscription as string | null,
  });
}

async function handleInvoicePaymentFailed(invoice: any) {
  const customerId = invoice.customer as string;
  const userId = await getUserIdByStripeCustomer(customerId);
  if (!userId) return;

  await logAuditEvent(userId, 'invoice.payment_failed' as any, 'invoice', undefined, {
    stripeInvoiceId: invoice.id,
    amountDue: invoice.amount_due,
    currency: invoice.currency,
    attemptCount: invoice.attempt_count,
    subscriptionId: invoice.subscription as string | null,
  });
}

async function handleTrialWillEnd(subscription: any) {
  const customerId = subscription.customer as string;
  const userId = await getUserIdByStripeCustomer(customerId);
  if (!userId) return;

  await logAuditEvent(userId, 'subscription.trial_will_end' as any, 'subscription', undefined, {
    stripeSubscriptionId: subscription.id,
    trialEnd: subscription.trial_end,
    status: subscription.status,
  });
}

// ─── Route Handler ──────────────────────────────────────────────

export async function POST(request: Request) {
  // Raw body required for Stripe signature verification
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  if (!WEBHOOK_SECRET) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[stripe-webhook] Signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object);
        break;
      default:
        // Unhandled event type — acknowledge but skip
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error(`[stripe-webhook] Error processing ${event.type}:`, err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
