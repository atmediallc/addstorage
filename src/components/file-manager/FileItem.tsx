// src/components/file-manager/FileItem.tsx
'use client';

import { useFileManager } from './FileManagerContext';
import { Folder, File } from 'lucide-react';
import type { SerializedFolder, SerializedFile } from './types';

function formatFileSize(size: string | null | undefined): string {
  if (!size) return '—';
  const bytes = Number(size);
  if (isNaN(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

interface FileItemProps {
  item: SerializedFolder | SerializedFile;
  type: 'folder' | 'file';
  viewMode: 'grid' | 'list';
}

export function FileItem({ item, type, viewMode }: FileItemProps) {
  const { currentFolderId, setCurrentFolderId, toggleSelect, selectedItems } = useFileManager();

  const isSelected = selectedItems.has(item.uniqueId);

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      toggleSelect(item.uniqueId);
    } else if (type === 'folder') {
      setCurrentFolderId(item.uniqueId);
    }
  };

  if (viewMode === 'grid') {
    return (
      <div
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          // Context menu will be added in a later task
        }}
        className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors cursor-pointer hover:bg-gray-50 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
      >
        {type === 'folder' ? (
          <Folder className="h-12 w-12 text-yellow-500" />
        ) : (
          <File className="h-12 w-12 text-gray-400" />
        )}
        <span className="w-full truncate text-center text-sm">{item.name ?? 'Unnamed'}</span>
      </div>
    );
  }

  return (
    <tr
      onClick={handleClick}
      className={`cursor-pointer border-b hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
    >
      <td className="flex items-center gap-2 py-2 pr-4">
        {type === 'folder' ? <Folder className="h-4 w-4 text-yellow-500" /> : <File className="h-4 w-4 text-gray-400" />}
        <span className="truncate">{item.name ?? 'Unnamed'}</span>
      </td>
      <td className="px-4 py-2 text-gray-500">{type === 'file' ? formatFileSize((item as SerializedFile).filesize) : '—'}</td>
      <td className="px-4 py-2 text-gray-500">{type === 'file' ? (item as SerializedFile).mimetype : 'Folder'}</td>
      <td className="pl-4 py-2 text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</td>
    </tr>
  );
}
