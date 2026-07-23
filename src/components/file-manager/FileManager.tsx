// src/components/file-manager/FileManager.tsx
'use client';

import { FileManagerProvider, useFileManager } from './FileManagerContext';
import { Breadcrumb } from './Breadcrumb';
import { Toolbar } from './Toolbar';
import { FileGrid } from './FileGrid';
import { FileList } from './FileList';
import { UploadZone } from './UploadZone';
import { UploadProgress } from './UploadProgress';
import { trpc } from '@/lib/trpc';

function FileManagerInner() {
  const { currentFolderId, viewMode } = useFileManager();

  const { data: folders } = trpc.files.listFolders.useQuery({ parentId: currentFolderId });
  const { data: files } = trpc.files.listFiles.useQuery({ folderId: currentFolderId });

  return (
    <div className="flex h-full flex-col">
      <Breadcrumb />
      <Toolbar />
      <UploadZone>
        <div className="flex-1 overflow-auto">
          {viewMode === 'grid' ? (
            <FileGrid folders={folders ?? []} files={files ?? []} />
          ) : (
            <FileList folders={folders ?? []} files={files ?? []} />
          )}
        </div>
      </UploadZone>
      <UploadProgress />
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
