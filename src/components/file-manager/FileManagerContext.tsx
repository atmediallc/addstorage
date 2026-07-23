// src/components/file-manager/FileManagerContext.tsx
'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ViewMode = 'grid' | 'list';

interface FileManagerState {
  currentFolderId: number;
  selectedItems: Set<number>;
  viewMode: ViewMode;
  setCurrentFolderId: (id: number) => void;
  toggleSelect: (uniqueId: number) => void;
  selectAll: (ids: number[]) => void;
  clearSelection: () => void;
  setViewMode: (mode: ViewMode) => void;
}

const FileManagerContext = createContext<FileManagerState | null>(null);

export function FileManagerProvider({ children }: { children: ReactNode }) {
  const [currentFolderId, setCurrentFolderId] = useState(0);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('fm-view-mode') as ViewMode) ?? 'grid';
    }
    return 'grid';
  });

  const toggleSelect = useCallback((uniqueId: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(uniqueId)) next.delete(uniqueId);
      else next.add(uniqueId);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: number[]) => {
    setSelectedItems(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const handleSetViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('fm-view-mode', mode);
  }, []);

  return (
    <FileManagerContext.Provider
      value={{
        currentFolderId,
        selectedItems,
        viewMode,
        setCurrentFolderId,
        toggleSelect,
        selectAll,
        clearSelection,
        setViewMode: handleSetViewMode,
      }}
    >
      {children}
    </FileManagerContext.Provider>
  );
}

export function useFileManager() {
  const context = useContext(FileManagerContext);
  if (!context) throw new Error('useFileManager must be used within FileManagerProvider');
  return context;
}
