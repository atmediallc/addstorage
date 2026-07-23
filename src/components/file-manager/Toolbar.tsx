// src/components/file-manager/Toolbar.tsx
'use client';

import { useFileManager } from './FileManagerContext';
import { Grid3X3, List, FolderPlus, Upload } from 'lucide-react';

export function Toolbar() {
  const { viewMode, setViewMode } = useFileManager();

  return (
    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
          <Upload className="h-4 w-4" />
          Upload
        </button>
        <button className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <FolderPlus className="h-4 w-4" />
          New Folder
        </button>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setViewMode('grid')}
          className={`rounded p-1.5 ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Grid3X3 className="h-4 w-4" />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`rounded p-1.5 ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <List className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
