// src/components/file-manager/FileGrid.tsx
'use client';

import { FileItem } from './FileItem';
import type { SerializedFolder, SerializedFile } from './types';

interface FileGridProps {
  folders: SerializedFolder[];
  files: SerializedFile[];
}

export function FileGrid({ folders, files }: FileGridProps) {
  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        This folder is empty.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {folders.map((folder) => (
        <FileItem key={folder.uniqueId} item={folder} type="folder" viewMode="grid" />
      ))}
      {files.map((file) => (
        <FileItem key={file.uniqueId} item={file} type="file" viewMode="grid" />
      ))}
    </div>
  );
}
