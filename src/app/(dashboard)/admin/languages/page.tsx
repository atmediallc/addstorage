'use client';

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';
import { Plus, Trash2, Search, Edit2, Check, RefreshCw, Globe } from 'lucide-react';

export default function AdminLanguagesPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: languages, isLoading: langsLoading } = trpc.admin.listLanguages.useQuery();
  const [selectedLangId, setSelectedLangId] = useState<string | null>(null);

  // Derive selectedLang from explicit selection or auto-pick (EN or first)
  const selectedLang = useMemo(() => {
    if (selectedLangId && languages) {
      return languages.find((l) => l.id === selectedLangId) ?? null;
    }
    if (languages && languages.length > 0) {
      return languages.find((l) => l.locale === 'en') || languages[0];
    }
    return null;
  }, [selectedLangId, languages]);

  const { data: strings, isLoading: stringsLoading } = trpc.admin.listTranslations.useQuery(
    { languageId: selectedLang?.id ?? '' },
    { enabled: !!selectedLang },
  );

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [locale, setLocale] = useState('');

  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const [referenceStrings] = useState<Record<string, string>>({
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'preview.notAvailable': 'Preview not available for this file type.',
    'preview.downloadToView': 'Download to view',
    'preview.versionHistory': 'Version History',
    'admin.dashboard': 'Dashboard',
    'admin.users': 'Users',
    'admin.settings': 'Settings',
    'admin.languages': 'Languages',
    'admin.pages': 'Pages',
    'admin.totalUsers': 'Total Users',
  });

  const createLang = trpc.admin.createLanguage.useMutation({
    onSuccess: (res) => {
      toast('Language created successfully', 'success');
      utils.admin.listLanguages.invalidate();
      setShowCreate(false);
      setName('');
      setLocale('');
      if (res.language) setSelectedLangId(res.language.id);
    },
    onError: (err) => toast(err.message, 'error'),
  });

  const deleteLang = trpc.admin.deleteLanguage.useMutation({
    onSuccess: () => {
      toast('Language deleted successfully', 'success');
      utils.admin.listLanguages.invalidate();
      setSelectedLangId(null);
    },
    onError: (err) => toast(err.message, 'error'),
  });

  const updateTrans = trpc.admin.updateTranslation.useMutation({
    onSuccess: () => {
      toast('Translation updated', 'success');
      utils.admin.listTranslations.invalidate({ languageId: selectedLang?.id });
      setEditingKey(null);
    },
    onError: (err) => toast(err.message, 'error'),
  });

  const handleUpdateTranslation = (key: string, value: string) => {
    if (!selectedLang) return;
    updateTrans.mutate({
      lang: selectedLang.locale,
      key,
      value,
    });
  };

  const handleCreateTranslation = () => {
    if (!selectedLang || !newKey || !newValue) return;
    updateTrans.mutate({
      lang: selectedLang.locale,
      key: newKey,
      value: newValue,
    });
    setNewKey('');
    setNewValue('');
  };

  const filteredStrings = strings?.filter(
    (item) =>
      item.key.toLowerCase().includes(search.toLowerCase()) ||
      item.value.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Translation Workbench</h1>
          <p className="text-sm text-gray-500 mt-1">Manage database localization strings and languages</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Language
        </button>
      </div>

      {showCreate && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Create New Locale</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (e.g., German)"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              placeholder="Locale code (e.g., de)"
              maxLength={5}
              className="sm:w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => createLang.mutate({ name, locale })}
                disabled={!name || !locale || createLang.isPending}
                className="flex-1 sm:flex-initial rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {langsLoading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid md:grid-cols-4 gap-6">
          {/* Left Languages Sidebar column */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider px-1">Locales</h2>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
              {languages?.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setSelectedLangId(lang.id)}
                  className={`w-full flex items-center justify-between p-3.5 text-left text-sm font-medium transition-colors ${
                    selectedLang?.id === lang.id
                      ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <span>{lang.name}</span>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-mono">
                    {lang.locale}
                  </span>
                </button>
              ))}
            </div>

            {selectedLang && (
              <button
                onClick={() => {
                  if (confirm(`Are you absolutely sure you want to delete ${selectedLang.name}? This will cascade delete all translation strings.`)) {
                    deleteLang.mutate({ id: selectedLang.id });
                  }
                }}
                disabled={deleteLang.isPending}
                className="w-full flex items-center justify-center gap-1.5 py-3 rounded-lg border border-red-200 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 cursor-pointer transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected Locale
              </button>
            )}
          </div>

          {/* Right translations grid workbench column */}
          <div className="md:col-span-3 space-y-6">
            {!selectedLang ? (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500 shadow-sm">
                Please select or create a language locale on the left sidebar to start.
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedLang.name} Strings</h2>
                    <p className="text-xs text-gray-500 font-mono mt-1">Locale code: {selectedLang.locale}</p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Search key or text..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {/* Add dynamic key form inline */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 space-y-3">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Add Custom Translation Key</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Key (e.g., auth.welcome_title)"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Value translation"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleCreateTranslation}
                        disabled={!newKey || !newValue || updateTrans.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {stringsLoading ? (
                  <div className="flex justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : !filteredStrings || filteredStrings.length === 0 ? (
                  <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center text-sm text-gray-500">
                    No keys found. Add keys above or populate default strings.
                  </div>
                ) : (
                  <div className="overflow-hidden border border-gray-100 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-gray-500">Key</th>
                          <th className="px-4 py-3 text-left font-bold text-gray-500 hidden sm:table-cell">EN Reference</th>
                          <th className="px-4 py-3 text-left font-bold text-gray-500">Translation</th>
                          <th className="px-4 py-3 text-right font-bold text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {filteredStrings.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3.5 font-mono text-xs text-gray-900 break-all max-w-[150px]">{item.key}</td>
                            <td className="px-4 py-3.5 text-gray-400 hidden sm:table-cell max-w-[200px] break-words">
                              {referenceStrings[item.key] || <span className="italic text-xs text-gray-300">none</span>}
                            </td>
                            <td className="px-4 py-3.5 max-w-[250px]">
                              {editingKey === item.key ? (
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                                />
                              ) : (
                                <span className="text-gray-700 break-words">{item.value || <span className="italic text-xs text-gray-300">empty</span>}</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                              {editingKey === item.key ? (
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => handleUpdateTranslation(item.key, editingValue)}
                                    disabled={updateTrans.isPending}
                                    className="p-1 rounded text-green-600 hover:bg-green-50"
                                  >
                                    <Check className="h-4.5 w-4.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingKey(null)}
                                    className="p-1 rounded text-gray-400 hover:bg-gray-100"
                                  >
                                    <Plus className="h-4.5 w-4.5 rotate-45" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingKey(item.key);
                                    setEditingValue(item.value);
                                  }}
                                  className="p-1.5 rounded text-gray-400 hover:bg-gray-100 hover:text-blue-600 cursor-pointer"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
