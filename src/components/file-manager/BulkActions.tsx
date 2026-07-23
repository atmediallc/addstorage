'use client';

import { useState } from 'react';
import { useFileManager } from './FileManagerContext';
import { MoveDialog } from './MoveDialog';
import { Trash2, FolderInput, Star, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function BulkActions() {
  const { selectedItems, clearSelection, currentFolderId } = useFileManager();
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const deleteFiles = trpc.files.deleteFiles.useMutation({
    onSuccess: () => {
      toast(`${selectedItems.size} item(s) deleted`, 'success');
      clearSelection();
      utils.files.listFiles.invalidate();
      utils.files.listFolders.invalidate();
    },
    onError: (err) => toast(err.message, 'error'),
  });

  const toggleFavourite = trpc.files.toggleFavourite.useMutation({
    onSuccess: () => {
      toast('Favourites updated', 'success');
      utils.files.listFiles.invalidate();
    },
    onError: (err) => toast(err.message, 'error'),
  });

  if (selectedItems.size === 0) return null;

  const handleBulkFavourite = () => {
    for (const id of Array.from(selectedItems)) {
      toggleFavourite.mutate({ folderId: id });
    }
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedItems);
    deleteFiles.mutate({ ids });
  };

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 dark:border-blue-800 dark:bg-blue-900/20">
        <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
          {selectedItems.size} item(s) selected
        </span>
        <button
          onClick={() => setShowBulkMove(true)}
          className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <FolderInput className="h-4 w-4" />
          Move
        </button>
        <button
          onClick={handleBulkFavourite}
          className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-yellow-600 hover:bg-yellow-50 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <Star className="h-4 w-4" />
          Favourite
        </button>
        <button
          onClick={() => setShowBulkDelete(true)}
          className="flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
        <button
          onClick={clearSelection}
          className="rounded p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <AlertDialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedItems.size} item(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Items will be moved to trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteFiles.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MoveDialog
        open={showBulkMove}
        onOpenChange={setShowBulkMove}
        itemIds={Array.from(selectedItems)}
        currentFolderId={currentFolderId}
      />
    </>
  );
}
