'use client';

import { useState, useCallback, type DragEvent } from 'react';
import { trpc } from '@/lib/trpc';
import { useFileManager } from './FileManagerContext';
import { Folder, ChevronRight, ChevronDown, Home } from 'lucide-react';

interface FolderNode {
  uniqueId: number;
  name: string | null;
  parentId: number;
}

export function FolderTree() {
  const { currentFolderId, setCurrentFolderId } = useFileManager();
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const { data: allFolders } = trpc.files.listAllFolders?.useQuery() ?? { data: [] };

  const moveItem = trpc.files.moveItems.useMutation({
    onSuccess: () => {
      setDropTarget(null);
    },
  });

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDragOver = (e: DragEvent, folderId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(folderId);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: DragEvent, targetId: number) => {
    e.preventDefault();
    setDropTarget(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json')) as {
        uniqueId: number;
        type: 'file' | 'folder';
      };
      if (data.uniqueId !== targetId) {
        const isFile = data.type === 'file';
        moveItem.mutate({
          folderIds: isFile ? [] : [data.uniqueId],
          fileIds: isFile ? [data.uniqueId] : [],
          targetFolderId: targetId,
        });
      }
    } catch {
      // invalid drag data
    }
  };

  const renderNode = (node: FolderNode, depth: number) => {
    const children = allFolders?.filter((f: FolderNode) => f.parentId === node.uniqueId) ?? [];
    const isExpanded = expanded.has(node.uniqueId);
    const isActive = currentFolderId === node.uniqueId;
    const isDropTargetHere = dropTarget === node.uniqueId;

    return (
      <div key={node.uniqueId}>
        <div
          onClick={() => setCurrentFolderId(node.uniqueId)}
          onDragOver={(e) => handleDragOver(e, node.uniqueId)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node.uniqueId)}
          className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors ${
            isActive
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : isDropTargetHere
              ? 'bg-green-50 text-green-700 ring-2 ring-green-400 dark:bg-green-900/30 dark:text-green-400'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {children.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.uniqueId);
              }}
              className="rounded p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <span className="w-[18px]" />
          )}
          <Folder className="h-4 w-4 text-yellow-500" />
          <span className="truncate">{node.name ?? 'Unnamed'}</span>
        </div>
        {isExpanded && children.map((child: FolderNode) => renderNode(child, depth + 1))}
      </div>
    );
  };

  const rootFolders = allFolders?.filter((f: FolderNode) => f.parentId === 0) ?? [];

  return (
    <div className="space-y-1">
      {/* Root */}
      <div
        onClick={() => setCurrentFolderId(0)}
        onDragOver={(e) => handleDragOver(e, 0)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 0)}
        className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
          currentFolderId === 0
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : dropTarget === 0
            ? 'bg-green-50 text-green-700 ring-2 ring-green-400 dark:bg-green-900/30 dark:text-green-400'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        }`}
      >
        <Home className="h-4 w-4" />
        <span>All Files</span>
      </div>

      {rootFolders.map((folder: FolderNode) => renderNode(folder, 1))}
    </div>
  );
}
