// src/components/file-manager/DeleteDialog.tsx
'use client';

import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { trpc } from '@/lib/trpc';
import { useFileManager } from './FileManagerContext';
import { useToast } from '@/components/ui/toast';

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: number;
  itemType: 'folder' | 'file';
  itemName: string;
}

export function DeleteDialog({ open, onOpenChange, itemId, itemType, itemName }: DeleteDialogProps) {
  const { currentFolderId } = useFileManager();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const deleteItem = trpc.files.deleteItem.useMutation({
    onSuccess: () => {
      toast('Moved to trash', 'success');
      utils.files.listFolders.invalidate({ parentId: currentFolderId });
      utils.files.listFiles.invalidate({ folderId: currentFolderId });
      onOpenChange(false);
    },
    onError: (error) => toast(error.message, 'error'),
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {itemType === 'folder' ? 'Folder' : 'File'}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{itemName}&quot;? It will be moved to trash.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteItem.mutate({ uniqueId: itemId, type: itemType })}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {deleteItem.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
