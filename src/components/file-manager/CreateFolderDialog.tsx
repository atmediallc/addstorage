'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { useFileManager } from './FileManagerContext';
import { useToast } from '@/components/ui/toast';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFolderDialog({ open, onOpenChange }: CreateFolderDialogProps) {
  const [name, setName] = useState('');
  const { currentFolderId } = useFileManager();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const createFolder = trpc.files.createFolder.useMutation({
    onSuccess: () => {
      toast('Folder created', 'success');
      utils.files.listFolders.invalidate({ parentId: currentFolderId });
      setName('');
      onOpenChange(false);
    },
    onError: (error) => {
      toast(error.message, 'error');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
        </DialogHeader>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Folder name"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) {
              createFolder.mutate({ name: name.trim(), parentId: currentFolderId });
            }
          }}
        />
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (name.trim()) {
                createFolder.mutate({ name: name.trim(), parentId: currentFolderId });
              }
            }}
            disabled={!name.trim() || createFolder.isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {createFolder.isPending ? 'Creating...' : 'Create'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
