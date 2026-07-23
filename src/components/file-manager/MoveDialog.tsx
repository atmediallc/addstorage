'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';
import { useFileManager } from './FileManagerContext';
import { Folder, ChevronRight, ArrowLeft } from 'lucide-react';

interface MoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemIds: number[];
  currentFolderId: number;
}

export function MoveDialog({ open, onOpenChange, itemIds, currentFolderId }: MoveDialogProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [parentId, setParentId] = useState(0);

  const { data: folders, isLoading } = trpc.files.listFolders.useQuery(
    { parentId },
    { enabled: open },
  );

  const moveItems = trpc.files.moveItems.useMutation({
    onSuccess: () => {
      toast(`${itemIds.length} item(s) moved`, 'success');
      utils.files.listFiles.invalidate();
      utils.files.listFolders.invalidate();
      onOpenChange(false);
    },
    onError: (err) => toast(err.message, 'error'),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Move to folder</h2>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading folders...</div>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
            {/* Root option */}
            <button
              onClick={() => setSelectedFolderId(0)}
              className={`flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800 ${
                selectedFolderId === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <Folder className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">Root folder</span>
            </button>

            {folders?.map((folder) => (
              <button
                key={folder.uniqueId}
                onClick={() => setSelectedFolderId(folder.uniqueId)}
                className={`flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800 ${
                  selectedFolderId === folder.uniqueId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <Folder className="h-4 w-4 text-yellow-500" />
                <span className="text-gray-700 dark:text-gray-300">{folder.name ?? 'Unnamed'}</span>
              </button>
            ))}

            {!folders || folders.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-500">No folders here</div>
            ) : null}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedFolderId !== null) {
                moveItems.mutate({
                  folderIds: itemIds.filter((id) => id > 0),
                  fileIds: [],
                  targetFolderId: selectedFolderId,
                });
              }
            }}
            disabled={selectedFolderId === null || moveItems.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {moveItems.isPending ? 'Moving...' : 'Move'}
          </button>
        </div>
      </div>
    </div>
  );
}
