'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Cloud, Lock, Download, File, Folder } from 'lucide-react';

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  const { data: shareContent, isLoading, error } = trpc.files.getShareContent.useQuery(
    { token, password: authenticated ? password : undefined },
    { enabled: !!token },
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-sm text-gray-500">Loading shared content...</div>
      </div>
    );
  }

  if (error && error.message.includes('password')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-center">
            <Lock className="h-12 w-12 text-yellow-500" />
          </div>
          <h1 className="mb-2 text-center text-lg font-semibold text-gray-900 dark:text-white">
            Password Protected
          </h1>
          <p className="mb-4 text-center text-sm text-gray-500">
            Enter the password to access this shared content.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAuthenticated(true);
            }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800"
              autoFocus
            />
            <button
              type="submit"
              disabled={!password}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Access Content
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error || !shareContent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h1 className="mb-2 text-center text-lg font-semibold text-gray-900 dark:text-white">
            Link Expired or Invalid
          </h1>
          <p className="text-center text-sm text-gray-500">
            This share link has expired or is no longer valid.
          </p>
        </div>
      </div>
    );
  }

  const { share } = shareContent;
  const isFolder = share.type === 'folder';

  // Type-safe access to folder data
  const folderData = 'folder' in shareContent ? shareContent : null;
  const fileData = 'file' in shareContent ? shareContent : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Cloud className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-bold text-gray-900 dark:text-white">TutisCloud</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Shared content</span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-3">
            {isFolder ? (
              <Folder className="h-8 w-8 text-yellow-500" />
            ) : (
              <File className="h-8 w-8 text-blue-500" />
            )}
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isFolder ? (folderData?.folder?.name ?? 'Shared Folder') : (fileData?.file?.name ?? 'Shared File')}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isFolder ? 'Folder' : 'File'} •{' '}
                {share.permission === 'editor' ? 'Editor access' : 'View only'}
              </p>
            </div>
          </div>

          {!isFolder && fileData?.file && (
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <File className="h-10 w-10 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{fileData.file.name}</p>
                  <p className="text-xs text-gray-500">{fileData.file.mimetype}</p>
                </div>
              </div>
            </div>
          )}

          {isFolder && folderData && (
            <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700">
              {folderData.folders.length === 0 && folderData.files.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">Empty folder</div>
              ) : (
                <>
                  {folderData.folders.map((folder: { uniqueId: number; name: string | null }) => (
                    <div
                      key={folder.uniqueId}
                      className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-800"
                    >
                      <Folder className="h-5 w-5 text-yellow-500" />
                      <span className="flex-1 text-sm text-gray-900 dark:text-white">{folder.name ?? 'Unnamed'}</span>
                    </div>
                  ))}
                  {folderData.files.map((file: { uniqueId: number; name: string | null }) => (
                    <div
                      key={file.uniqueId}
                      className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-800"
                    >
                      <File className="h-5 w-5 text-blue-500" />
                      <span className="flex-1 text-sm text-gray-900 dark:text-white">{file.name ?? 'Unnamed'}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
