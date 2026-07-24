'use client';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Eye, Pencil, Trash2, Download, FolderOpen, Share2, History } from 'lucide-react';
import type { ReactNode } from 'react';

interface ItemContextMenuProps {
  children: ReactNode;
  type: 'folder' | 'file';
  onOpen?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onPreview?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onVersions?: () => void;
}

export function ItemContextMenu({
  children,
  type,
  onOpen,
  onRename,
  onDelete,
  onPreview,
  onDownload,
  onShare,
  onVersions,
}: ItemContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {type === 'folder' && (
          <ContextMenuItem onClick={onOpen}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Open
          </ContextMenuItem>
        )}
        {type === 'file' && (
          <ContextMenuItem onClick={onPreview}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={onDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </ContextMenuItem>
        {type === 'file' && onVersions && (
          <ContextMenuItem onClick={onVersions}>
            <History className="mr-2 h-4 w-4" />
            Version History
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onRename}>
          <Pencil className="mr-2 h-4 w-4" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={onDelete} className="text-red-600 focus:bg-red-50 focus:text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
