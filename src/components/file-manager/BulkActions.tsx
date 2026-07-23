'use client';

import { useFileManager } from './FileManagerContext';
import { Trash2, FolderInput, X } from 'lucide-react';

export function BulkActions() {
  const { selectedItems, clearSelection } = useFileManager();

  if (selectedItems.size === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
      <span className="text-sm font-medium text-blue-700">
        {selectedItems.size} item(s) selected
      </span>
      <button className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
        <FolderInput className="h-4 w-4" />
        Move
      </button>
      <button className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
      <button
        onClick={clearSelection}
        className="rounded p-1.5 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
