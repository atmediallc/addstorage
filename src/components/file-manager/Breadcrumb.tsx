// src/components/file-manager/Breadcrumb.tsx
'use client';

import { useFileManager } from './FileManagerContext';
import { trpc } from '@/lib/trpc';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumb() {
  const { currentFolderId, setCurrentFolderId } = useFileManager();
  const { data: path } = trpc.files.getBreadcrumb.useQuery(
    { folderId: currentFolderId },
    { enabled: currentFolderId !== 0 },
  );

  return (
    <nav className="flex items-center gap-1 border-b border-gray-200 px-4 py-2 text-sm">
      <button
        onClick={() => setCurrentFolderId(0)}
        className="flex items-center gap-1 rounded px-2 py-1 text-gray-600 hover:bg-gray-100"
      >
        <Home className="h-4 w-4" />
        <span>Root</span>
      </button>
      {path?.map((item) => (
        <span key={item.uniqueId} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <button
            onClick={() => setCurrentFolderId(item.uniqueId)}
            className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100"
          >
            {item.name ?? 'Unnamed'}
          </button>
        </span>
      ))}
    </nav>
  );
}
