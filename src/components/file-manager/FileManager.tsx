// src/components/file-manager/FileManager.tsx
'use client';

import { FileManagerProvider, useFileManager } from './FileManagerContext';
import { Breadcrumb } from './Breadcrumb';
import { Toolbar } from './Toolbar';
import { FileGrid } from './FileGrid';
import { FileList } from './FileList';
import { UploadZone } from './UploadZone';
import { UploadProgress } from './UploadProgress';
import { useUpload } from './use-upload';
import { trpc } from '@/lib/trpc';

function FileManagerInner() {
  const { currentFolderId, viewMode } = useFileManager();
  const { uploads, uploadFiles, clearDone } = useUpload();

  const { data: folders } = trpc.files.listFolders.useQuery({ parentId: currentFolderId });
  const { data: files } = trpc.files.listFiles.useQuery({ folderId: currentFolderId });

  return (
    <div className="flex h-full flex-col">
      <Breadcrumb />
      <Toolbar />
      <UploadZone onFiles={uploadFiles}>
        <div className="flex-1 overflow-auto">
          {viewMode === 'grid' ? (
            <FileGrid folders={folders ?? []} files={files ?? []} />
          ) : (
            <FileList folders={folders ?? []} files={files ?? []} />
          )}
        </div>
      </UploadZone>
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
