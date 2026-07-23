// src/components/file-manager/RenameDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { useFileManager } from './FileManagerContext';
import { useToast } from '@/components/ui/toast';

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: number;
  itemType: 'folder' | 'file';
  currentName: string;
}

export function RenameDialog({ open, onOpenChange, itemId, itemType, currentName }: RenameDialogProps) {
  const [name, setName] = useState(currentName);
  const { currentFolderId } = useFileManager();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (open) {
      setName(currentName);
    }
  }, [open, currentName]);

  const rename = trpc.files.renameItem.useMutation({
    onSuccess: () => {
      toast('Renamed successfully', 'success');
      utils.files.listFolders.invalidate({ parentId: currentFolderId });
      utils.files.listFiles.invalidate({ folderId: currentFolderId });
      onOpenChange(false);
    },
    onError: (error) => toast(error.message, 'error'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename {itemType === 'folder' ? 'Folder' : 'File'}</DialogTitle>
        </DialogHeader>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim() && name !== currentName) {
              rename.mutate({ uniqueId: itemId, name: name.trim(), type: itemType });
            }
          }}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => {
              if (name.trim() && name !== currentName) {
                rename.mutate({ uniqueId: itemId, name: name.trim(), type: itemType });
              }
            }}
            disabled={!name.trim() || name === currentName || rename.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Rename
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
