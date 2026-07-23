'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { File, Folder, Download, Lock, AlertCircle } from 'lucide-react';

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const { data, isLoading, error } = trpc.files.getShareContent.useQuery(
    { token, password: password || undefined },
    { enabled: !!token },
  );

  const download = trpc.files.getShareDownloadUrl.useQuery(
    { token, fileId: undefined },
    { enabled: false },
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-lg font-semibold text-gray-900">
            {error.message || 'Share not found'}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            This link may have expired or been revoked.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { share, files, folders } = data;

  // Password form
  if (share.protected && !password) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <Lock className="mx-auto h-10 w-10 text-gray-400" />
          <h1 className="mt-4 text-center text-lg font-semibold">Password Required</h1>
          <p className="mt-2 text-center text-sm text-gray-500">
            This share is password protected.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPasswordError('');
            }}
            className="mt-4 space-y-3"
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {passwordError && (
              <p className="text-xs text-red-500">{passwordError}</p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Access Share
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">
            {share.type === 'folder' ? 'Shared Folder' : 'Shared File'}
          </h1>
          <span className="text-sm text-gray-500">
            Shared via TutisCloud
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6">
        {folders.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-medium text-gray-700">Folders</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {folders.map((folder) => (
                <div
                  key={folder.uniqueId}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                >
                  <Folder className="h-8 w-8 text-yellow-500" />
                  <span className="truncate text-sm">{folder.name ?? 'Unnamed'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-medium text-gray-700">Files</h2>
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.uniqueId}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div className="flex items-center gap-3">
                    <File className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">{file.name ?? 'Unnamed'}</p>
                      <p className="text-xs text-gray-500">{file.mimetype}</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      const result = await download.refetch();
                      if (result.data?.url) {
                        window.open(result.data.url, '_blank');
                      }
                    }}
                    className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length === 0 && folders.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-500">
            This share is empty.
          </div>
        )}
      </main>
    </div>
  );
}
