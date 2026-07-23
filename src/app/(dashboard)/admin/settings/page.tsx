'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const { data: settings, isLoading } = trpc.admin.getSettings.useQuery();
  const updateSettings = trpc.admin.updateSettings.useMutation({
    onSuccess: () => toast('Settings saved', 'success'),
    onError: (err) => toast(err.message, 'error'),
  });

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate({ settings: form });
  };

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  if (isLoading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">General</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">App Name</label>
              <input
                type="text"
                value={form.app_name ?? ''}
                onChange={(e) => update('app_name', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">App URL</label>
              <input
                type="url"
                value={form.app_url ?? ''}
                onChange={(e) => update('app_url', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Default Language</label>
              <input
                type="text"
                value={form.language ?? ''}
                onChange={(e) => update('language', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Currency</label>
              <input
                type="text"
                value={form.currency ?? ''}
                onChange={(e) => update('currency', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Stripe Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Stripe Publishable Key</label>
              <input
                type="text"
                value={form.stripe_key ?? ''}
                onChange={(e) => update('stripe_key', e.target.value)}
                placeholder="pk_..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Stripe Secret Key</label>
              <input
                type="password"
                value={form.stripe_secret ?? ''}
                onChange={(e) => update('stripe_secret', e.target.value)}
                placeholder="sk_..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Stripe Webhook Secret</label>
              <input
                type="password"
                value={form.stripe_webhook_secret ?? ''}
                onChange={(e) => update('stripe_webhook_secret', e.target.value)}
                placeholder="whsec_..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={updateSettings.isPending}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
