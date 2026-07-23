'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';
import { Eye, EyeOff } from 'lucide-react';

export default function AdminPagesPage() {
  const { toast } = useToast();
  const { data: pages, isLoading } = trpc.admin.listPages.useQuery();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  if (isLoading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pages</h1>

      {selectedSlug ? (
        <PageEditor slug={selectedSlug} onBack={() => setSelectedSlug(null)} />
      ) : (
        <>
          {!pages || pages.length === 0 ? (
            <p className="text-sm text-gray-500">No pages yet.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Slug</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Visibility</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {pages.map((page) => (
                    <tr key={page.slug}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{page.title}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">/{page.slug}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                          page.visibility ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {page.visibility ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {page.visibility ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          onClick={() => setSelectedSlug(page.slug)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PageEditor({ slug, onBack }: { slug: string; onBack: () => void }) {
  const { toast } = useToast();
  const { data: page, isLoading } = trpc.admin.getPage.useQuery({ slug });
  const updatePage = trpc.admin.updatePage.useMutation({
    onSuccess: () => toast('Page saved', 'success'),
    onError: (err) => toast(err.message, 'error'),
  });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState(true);
  const [loaded, setLoaded] = useState(false);

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (!page) return <div className="p-4">Page not found</div>;

  if (!loaded && page) {
    setTitle(page.title);
    setContent(page.content);
    setVisibility(page.visibility);
    setLoaded(true);
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800">
        ← Back to pages
      </button>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{page.title}</h2>
          <button
            onClick={() => setVisibility(!visibility)}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
              visibility ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {visibility ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {visibility ? 'Published' : 'Draft'}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Slug</label>
            <input
              type="text"
              value={slug}
              disabled
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => updatePage.mutate({ slug, title, content, visibility })}
            disabled={updatePage.isPending}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {updatePage.isPending ? 'Saving...' : 'Save Page'}
          </button>
        </div>
      </div>
    </div>
  );
}
