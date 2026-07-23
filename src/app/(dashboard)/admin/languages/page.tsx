'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';
import { Plus, Trash2 } from 'lucide-react';

export default function AdminLanguagesPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: languages, isLoading } = trpc.admin.listLanguages.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [locale, setLocale] = useState('');

  const createLang = trpc.admin.createLanguage.useMutation({
    onSuccess: () => {
      toast('Language created', 'success');
      utils.admin.listLanguages.invalidate();
      setShowCreate(false);
      setName('');
      setLocale('');
    },
    onError: (err) => toast(err.message, 'error'),
  });

  const deleteLang = trpc.admin.deleteLanguage.useMutation({
    onSuccess: () => {
      toast('Language deleted', 'success');
      utils.admin.listLanguages.invalidate();
    },
    onError: (err) => toast(err.message, 'error'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Languages</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Language
        </button>
      </div>

      {showCreate && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Language name (e.g., Spanish)"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              placeholder="Locale (e.g., es)"
              maxLength={5}
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => createLang.mutate({ name, locale })}
              disabled={!name || !locale || createLang.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="p-4">Loading...</div>
      ) : !languages || languages.length === 0 ? (
        <p className="text-sm text-gray-500">No languages configured.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Locale</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {languages.map((lang) => (
                <tr key={lang.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{lang.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{lang.locale}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <button
                      onClick={() => {
                        if (confirm(`Delete ${lang.name}?`)) {
                          deleteLang.mutate({ id: lang.id });
                        }
                      }}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
