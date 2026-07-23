'use client';

import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';
import { CreditCard, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function BillingPage() {
  const { toast } = useToast();
  const { data: plans, isLoading: plansLoading } = trpc.billing.getPlans.useQuery();
  const { data: subscription, isLoading: subLoading } = trpc.billing.getCurrentSubscription.useQuery();

  const checkout = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => toast(err.message, 'error'),
  });

  const portal = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => toast(err.message, 'error'),
  });

  if (plansLoading || subLoading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Billing</h1>

      {/* Current Subscription */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Current Plan</h2>
        {subscription ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Status:{' '}
                <span className={`font-medium ${subscription.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {subscription.status}
                </span>
              </p>
              {subscription.currentPeriodEnd && (
                <p className="text-sm text-gray-500">
                  Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <button
              onClick={() => portal.mutate()}
              disabled={portal.isPending}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ExternalLink className="h-4 w-4" />
              Manage Subscription
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No active subscription. Choose a plan below.</p>
        )}
      </div>

      {/* Available Plans */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Available Plans</h2>
        {plans && plans.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = subscription?.planId === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`rounded-lg border p-6 ${
                    isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{formatPrice(plan.price, plan.currency)}</span>
                    <span className="text-sm text-gray-500">/{plan.interval}</span>
                  </div>
                  <div className="mt-4">
                    {isCurrent ? (
                      <div className="flex items-center gap-1 text-sm font-medium text-blue-600">
                        <Check className="h-4 w-4" />
                        Current Plan
                      </div>
                    ) : (
                      <button
                        onClick={() => checkout.mutate({ priceId: plan.id })}
                        disabled={checkout.isPending}
                        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {checkout.isPending ? 'Redirecting...' : 'Select Plan'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No plans available. Configure plans in Stripe.</p>
        )}
      </div>

      {/* Quick Links */}
      <div className="flex gap-4">
        <Link
          href="/billing/payment-methods"
          className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <CreditCard className="h-4 w-4" />
          Payment Methods
        </Link>
        <Link
          href="/billing/invoices"
          className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <CreditCard className="h-4 w-4" />
          Invoices
        </Link>
      </div>
    </div>
  );
}
