'use client';

import { Suspense, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Cloud, Shield, Search, Share2, HardDrive, RefreshCw } from 'lucide-react';

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function SaasLandingPage() {
  const router = useRouter();
  const { data: settings, isLoading: settingsLoading } = trpc.cms.getPublicSettings.useQuery();
  const { data: plans } = trpc.billing.getPlans.useQuery();

  useEffect(() => {
    if (settings && settings.allow_homepage === '0') {
      router.replace('/login');
    }
  }, [settings, router]);

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500 font-medium">Loading TutisCloud...</p>
        </div>
      </div>
    );
  }

  if (settings?.allow_homepage === '0') {
    return null; // Redirecting
  }

  const appName = settings?.app_name || 'TutisCloud';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between antialiased">
      {/* Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
            {appName}
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="#features" className="hover:text-blue-600">Features</Link>
            {settings?.is_saas === '1' && <Link href="#pricing" className="hover:text-blue-600">Pricing</Link>}
            <Link href="/contact" className="hover:text-blue-600">Contact</Link>
            <Link href="/login" className="hover:text-blue-600 font-semibold">Sign In</Link>
            <Link href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white py-20 px-6 border-b border-gray-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
            Your Premium Self-Hosted Storage Cloud
          </h1>
          <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto">
            Securely store, organize, share, and access your files from anywhere, powered by a modern, high-speed interface.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-md shadow-sm">
              Create Free Account
            </Link>
            <Link href="#features" className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-md">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Designed for Secure File Management</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm text-center">
            <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 mx-auto mb-4">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Unbreakable Security</h3>
            <p className="text-sm text-gray-500">
              Mimetype blocklists, secure S3 presigned downloads, and strict RBAC protect your data from intrusions.
            </p>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm text-center">
            <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 mx-auto mb-4">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Instant Search</h3>
            <p className="text-sm text-gray-500">
              Find files, folders, and shared structures dynamically with metadata indexing.
            </p>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm text-center">
            <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center text-blue-600 mx-auto mb-4">
              <Share2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Secure Sharing</h3>
            <p className="text-sm text-gray-500">
              Create password-protected share links with expiration dates for collaboration.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Tables */}
      {settings?.is_saas === '1' && (
        <section id="pricing" className="bg-white py-20 px-6 border-y border-gray-200">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">Simple, Transparent Plans</h2>
              <p className="text-sm text-gray-500 mt-2">Choose the plan that matches your storage needs</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans?.map((plan, i) => {
                const isFree = typeof plan.product === 'object' && plan.product && 'name' in plan.product && plan.product.name === 'Free';
                return (
                  <div key={plan.id} className="border border-gray-200 bg-white rounded-xl p-8 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{typeof plan.product === 'object' && plan.product && 'name' in plan.product ? plan.product.name : 'Premium'}</h3>
                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold tracking-tight text-gray-900">
                          {formatPrice(plan.amount ?? 0, plan.currency)}
                        </span>
                        <span className="text-sm font-semibold text-gray-500">/{plan.interval}</span>
                      </div>
                      <ul className="mt-6 space-y-4">
                        <li className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="font-medium text-gray-900">
                            {plan.product && typeof plan.product === 'object' && 'metadata' in plan.product && plan.product.metadata && typeof plan.product.metadata === 'object' && 'capacity' in plan.product.metadata ? `${plan.product.metadata.capacity} ` : '5 '}
                          </span>
                          GB Storage Limit
                        </li>
                        <li className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="h-4 w-4 text-green-500" />
                          S3 Storage Driver
                        </li>
                        <li className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="h-4 w-4 text-green-500" />
                          {isFree ? 'Basic Support' : 'Priority Support'}
                        </li>
                      </ul>
                    </div>
                    <Link
                      href="/register"
                      className={`mt-8 block w-full rounded-lg py-2.5 text-center text-sm font-semibold hover:opacity-90 ${
                        i === 1 ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 bg-gray-50'
                      }`}
                    >
                      Get Started
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-blue-600 py-16 px-6 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold">Ready to Store Your Files Securely?</h2>
          <p className="mt-4 text-lg text-blue-100">
            Sign up now and receive {appName} configuration settings immediately.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/register" className="bg-white text-blue-600 font-bold px-6 py-3 rounded-md shadow-md hover:bg-gray-50">
              Get Started Customizing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex gap-2 items-center font-bold text-gray-800">
            {appName}
          </div>
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-blue-600">Pricing</Link>
            <Link href="/contact" className="hover:text-blue-600">Contact Us</Link>
            <Link href="/login" className="hover:text-blue-600">Sign In</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} {appName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
