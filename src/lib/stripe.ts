// src/lib/stripe.ts
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil' as any,
  typescript: true,
});

// Helper to get or create Stripe customer
export async function getOrCreateCustomer(userId: number, email: string, name?: string) {
  // Check if user already has a Stripe customer ID in settings
  // For now, create a new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId: String(userId) },
  });
  return customer;
}

// Get active plans
export async function getActivePlans() {
  const plans = await stripe.plans.list({ active: true });
  return plans.data;
}

// Get invoices for a customer
export async function getCustomerInvoices(customerId: string) {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 20,
  });
  return invoices.data;
}

// Get payment methods for a customer
export async function getCustomerPaymentMethods(customerId: string) {
  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
  return methods.data;
}

// Create checkout session
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  return session;
}

// Create customer portal session
export async function createPortalSession(customerId: string, returnUrl: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session;
}

// Delete payment method
export async function deletePaymentMethod(paymentMethodId: string) {
  await stripe.paymentMethods.detach(paymentMethodId);
}
