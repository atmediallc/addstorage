'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Cloud, Check, ChevronRight, ChevronLeft, Database, Settings, User, CreditCard } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

const STEPS = [
  { id: 1, title: 'Database', icon: Database },
  { id: 2, title: 'App Settings', icon: Settings },
  { id: 3, title: 'Admin Account', icon: User },
  { id: 4, title: 'Stripe (Optional)', icon: CreditCard },
];

export default function SetupPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1: Database
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('5432');
  const [dbName, setDbName] = useState('tutiscloud');
  const [dbUser, setDbUser] = useState('postgres');
  const [dbPassword, setDbPassword] = useState('');

  // Step 2: App Settings
  const [appName, setAppName] = useState('TutisCloud');
  const [appUrl, setAppUrl] = useState('http://localhost:3000');
  const [language, setLanguage] = useState('en');

  // Step 3: Admin Account
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Step 4: Stripe
  const [stripeKey, setStripeKey] = useState('');
  const [stripeSecret, setStripeSecret] = useState('');
  const [stripeWebhook, setStripeWebhook] = useState('');

  const handleNext = () => {
    if (step < STEPS.length) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = () => {
    // Validate
    if (!adminName || !adminEmail || !adminPassword) {
      toast('Please fill in all admin fields', 'error');
      return;
    }
    if (adminPassword.length < 8) {
      toast('Password must be at least 8 characters', 'error');
      return;
    }

    // In production, this would save all settings
    toast('Setup complete! Redirecting to login...', 'success');
    setTimeout(() => router.push('/login'), 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Cloud className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-bold text-gray-900">TutisCloud Setup</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Progress Steps */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    step > s.id
                      ? 'bg-green-500 text-white'
                      : step === s.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step > s.id ? <Check className="h-5 w-5" /> : s.id}
                </div>
                <span className="ml-2 hidden text-sm font-medium text-gray-700 sm:block">{s.title}</span>
                {i < STEPS.length - 1 && (
                  <div className={`mx-4 h-0.5 w-12 ${step > s.id ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {/* Step 1: Database */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Database Configuration</h2>
              <p className="text-sm text-gray-500">Configure your PostgreSQL database connection.</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Host</label>
                  <input
                    type="text"
                    value={dbHost}
                    onChange={(e) => setDbHost(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Port</label>
                  <input
                    type="text"
                    value={dbPort}
                    onChange={(e) => setDbPort(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Database Name</label>
                <input
                  type="text"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    value={dbUser}
                    onChange={(e) => setDbUser(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={dbPassword}
                    onChange={(e) => setDbPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Note: Database connection is configured via environment variables. These values are for reference only.
              </p>
            </div>
          )}

          {/* Step 2: App Settings */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Application Settings</h2>
              <p className="text-sm text-gray-500">Configure your site name and basic settings.</p>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Site Name</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Site URL</label>
                <input
                  type="url"
                  value={appUrl}
                  onChange={(e) => setAppUrl(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Default Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Admin Account */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Admin Account</h2>
              <p className="text-sm text-gray-500">Create the administrator account for your site.</p>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-400">Must include uppercase, lowercase, number, and special character.</p>
              </div>
            </div>
          )}

          {/* Step 4: Stripe */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Stripe Configuration <span className="text-sm font-normal text-gray-500">(Optional)</span></h2>
              <p className="text-sm text-gray-500">Connect Stripe to enable subscriptions and payments. You can configure this later.</p>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Stripe Publishable Key</label>
                <input
                  type="text"
                  value={stripeKey}
                  onChange={(e) => setStripeKey(e.target.value)}
                  placeholder="pk_..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Stripe Secret Key</label>
                <input
                  type="password"
                  value={stripeSecret}
                  onChange={(e) => setStripeSecret(e.target.value)}
                  placeholder="sk_..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Webhook Secret</label>
                <input
                  type="password"
                  value={stripeWebhook}
                  onChange={(e) => setStripeWebhook(e.target.value)}
                  placeholder="whsec_..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <p className="text-xs text-gray-400">
                Get your keys from <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Stripe Dashboard</a>.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex justify-between border-t border-gray-200 pt-4">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            {step < STEPS.length ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Complete Setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
