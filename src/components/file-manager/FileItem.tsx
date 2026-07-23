// src/components/file-manager/FileItem.tsx
'use client';

import { useState, useCallback, type DragEvent } from 'react';
import { useFileManager } from './FileManagerContext';
import { ItemContextMenu } from './ItemContextMenu';
import { RenameDialog } from './RenameDialog';
import { DeleteDialog } from './DeleteDialog';
import { PreviewModal } from './PreviewModal';
import { trpc } from '@/lib/trpc';
import { Folder, File } from 'lucide-react';

interface FileItemProps {
  item: { uniqueId: number; name: string | null; createdAt: string | Date; filesize?: string | null; mimetype?: string | null };
  type: 'folder' | 'file';
  viewMode: 'grid' | 'list';
}

export function FileItem({ item, type, viewMode }: FileItemProps) {
  const { currentFolderId, setCurrentFolderId, toggleSelect, selectedItems } = useFileManager();
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{ url: string; mimetype: string | null } | null>(null);
  const utils = trpc.useUtils();

  const handlePreview = useCallback(async () => {
    try {
      const data = await utils.client.files.getPreviewUrl.query({ uniqueId: item.uniqueId });
      setPreviewData({ url: data.url, mimetype: data.mimetype });
      setShowPreview(true);
    } catch {
      // silently fail
    }
  }, [item.uniqueId, utils.client]);

  const handleDownload = useCallback(async () => {
    try {
      const data = await utils.client.files.getPreviewUrl.query({ uniqueId: item.uniqueId });
      window.open(data.url, '_blank');
    } catch {
      // silently fail
    }
  }, [item.uniqueId, utils.client]);

  const handleClick = () => {
    if (type === 'folder') {
      setCurrentFolderId(item.uniqueId);
    }
  };

  const isSelected = selectedItems.has(item.uniqueId);

  const moveItem = trpc.files.moveItem.useMutation({
    onSuccess: () => {
      utils.files.listFolders.invalidate();
      utils.files.listFiles.invalidate();
    },
  });

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ uniqueId: item.uniqueId, type }));
  };

  const handleDragOver = (e: DragEvent) => {
    if (type === 'folder') {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (type !== 'folder') return;
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json')) as { uniqueId: number; type: 'file' | 'folder' };
      if (data.uniqueId !== item.uniqueId) {
        moveItem.mutate({ uniqueId: data.uniqueId, toFolderId: item.uniqueId, type: data.type });
      }
    } catch {
      // invalid drag data
    }
  };

  const itemContent = viewMode === 'grid' ? (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors cursor-pointer hover:bg-gray-50 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
    >
      {type === 'folder' ? <Folder className="h-12 w-12 text-yellow-500" /> : <File className="h-12 w-12 text-gray-400" />}
      <span className="w-full truncate text-center text-sm">{item.name ?? 'Unnamed'}</span>
    </div>
  ) : (
    <tr
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`cursor-pointer border-b hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
    >
      <td className="flex items-center gap-2 py-2 pr-4">
        {type === 'folder' ? <Folder className="h-4 w-4 text-yellow-500" /> : <File className="h-4 w-4 text-gray-400" />}
        <span className="truncate">{item.name ?? 'Unnamed'}</span>
      </td>
      <td className="px-4 py-2 text-gray-500">{type === 'file' ? formatFileSize((item as { filesize?: string | null }).filesize) : '—'}</td>
      <td className="px-4 py-2 text-gray-500">{type === 'file' ? (item as { mimetype?: string | null }).mimetype : 'Folder'}</td>
      <td className="pl-4 py-2 text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</td>
    </tr>
  );

  return (
    <>
      <ItemContextMenu
        type={type}
        onOpen={() => type === 'folder' && setCurrentFolderId(item.uniqueId)}
        onRename={() => setShowRename(true)}
        onDelete={() => setShowDelete(true)}
        onPreview={type === 'file' ? handlePreview : undefined}
        onDownload={type === 'file' ? handleDownload : undefined}
      >
        {itemContent}
      </ItemContextMenu>
      <RenameDialog
        open={showRename}
        onOpenChange={setShowRename}
        itemId={item.uniqueId}
        itemType={type}
        currentName={item.name ?? ''}
      />
      <DeleteDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        itemId={item.uniqueId}
        itemType={type}
        itemName={item.name ?? 'Unnamed'}
      />
      {showPreview && previewData && (
        <PreviewModal
          open={showPreview}
          onOpenChange={setShowPreview}
          url={previewData.url}
          name={item.name ?? 'Unnamed'}
          mimetype={previewData.mimetype}
        />
      )}
    </>
  );
}

function formatFileSize(size: string | null | undefined): string {
  if (!size) return '—';
  const bytes = Number(size);
  if (isNaN(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
