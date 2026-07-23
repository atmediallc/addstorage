// src/components/file-manager/FileList.tsx
'use client';

import { FileItem } from './FileItem';
import type { SerializedFolder, SerializedFile } from './types';

interface FileListProps {
  folders: SerializedFolder[];
  files: SerializedFile[];
}

export function FileList({ folders, files }: FileListProps) {
  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        This folder is empty.
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Size</th>
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Modified</th>
          </tr>
        </thead>
        <tbody>
          {folders.map((folder) => (
            <FileItem key={folder.uniqueId} item={folder} type="folder" viewMode="list" />
          ))}
          {files.map((file) => (
            <FileItem key={file.uniqueId} item={file} type="file" viewMode="list" />
          ))}
        </tbody>
      </table>
    </div>
  );
}
