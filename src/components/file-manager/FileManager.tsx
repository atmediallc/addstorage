// src/components/file-manager/FileManager.tsx
'use client';

import { useState, useCallback } from 'react';
import { FileManagerProvider, useFileManager } from './FileManagerContext';
import { Breadcrumb } from './Breadcrumb';
import { Toolbar } from './Toolbar';
import { FileGrid } from './FileGrid';
import { FileList } from './FileList';
import { UploadZone } from './UploadZone';
import { UploadProgress } from './UploadProgress';
import { SearchBar } from './SearchBar';
import { BulkActions } from './BulkActions';
import { FolderTree } from './FolderTree';
import { useUpload } from './use-upload';
import { trpc } from '@/lib/trpc';

function FileManagerInner() {
  const { currentFolderId, viewMode } = useFileManager();
  const { uploads, uploadFiles, clearDone } = useUpload();
  const [searchResults, setSearchResults] = useState<Array<{ uniqueId: number; name: string | null }> | null>(null);

  const { data: folders } = trpc.files.listFolders.useQuery({ parentId: currentFolderId });
  const { data: files } = trpc.files.listFiles.useQuery({ folderId: currentFolderId });

  const handleSearchResults = useCallback((results: Array<{ uniqueId: number; name: string | null }>) => {
    setSearchResults(results);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchResults(null);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <Breadcrumb />
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Folder Tree Sidebar */}
        <div className="hidden w-56 shrink-0 overflow-y-auto border-r border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900 md:block">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Folders
          </h3>
          <FolderTree />
        </div>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="px-4 py-2">
            <SearchBar onResults={handleSearchResults} onClear={handleSearchClear} />
          </div>
          <BulkActions />
          <UploadZone onFiles={uploadFiles}>
            <div className="flex-1 overflow-auto">
              {searchResults ? (
                <FileGrid folders={[]} files={searchResults as any} />
              ) : viewMode === 'grid' ? (
                <FileGrid folders={folders ?? []} files={files ?? []} />
              ) : (
                <FileList folders={folders ?? []} files={files ?? []} />
              )}
            </div>
          </UploadZone>
        </div>
      </div>
      <UploadProgress uploads={uploads} onClear={clearDone} />
    </div>
  );
}

export function FileManager() {
  return (
    <FileManagerProvider>
      <FileManagerInner />
    </FileManagerProvider>
  );
}
