'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { Check, Cloud } from 'lucide-react';

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function PricingPage() {
  const { data: plans, isLoading } = trpc.billing.getPlans.useQuery();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Cloud className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">TutisCloud</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="px-6 py-20 text-center">
        <h1 className="text-4xl font-bold text-gray-900">Simple, transparent pricing</h1>
        <p className="mt-4 text-lg text-gray-600">Choose the plan that fits your needs. No hidden fees.</p>
      </div>

      {/* Plans */}
      <div className="mx-auto max-w-6xl px-6 pb-20">
        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading plans...</div>
        ) : !plans || plans.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">Plans coming soon. Contact us for more information.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {plans.map((plan, i) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-8 ${
                  i === 1
                    ? 'border-blue-500 bg-white shadow-lg ring-1 ring-blue-500'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {i === 1 && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(plan.price, plan.currency)}
                  </span>
                  <span className="text-sm text-gray-500">/{plan.interval}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    {plan.name === 'Free' ? '1 GB storage' : 'Unlimited storage'}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    File sharing
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    {plan.name === 'Free' ? 'Basic support' : 'Priority support'}
                  </li>
                </ul>
                <Link
                  href="/register"
                  className={`mt-8 block w-full rounded-lg py-2.5 text-center text-sm font-semibold ${
                    i === 1
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-gray-500">
          © 2026 TutisCloud. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
