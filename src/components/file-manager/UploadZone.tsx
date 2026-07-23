// src/components/file-manager/UploadZone.tsx
'use client';

import { useState, useCallback, useRef, type ReactNode } from 'react';
import { useFileManager } from './FileManagerContext';

interface UploadZoneProps {
  children: ReactNode;
  onFiles?: (files: FileList, folderId: number) => void;
}

export function UploadZone({ children, onFiles }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { currentFolderId } = useFileManager();
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0 && onFiles) {
        onFiles(e.dataTransfer.files, currentFolderId);
      }
    },
    [currentFolderId, onFiles],
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative flex-1"
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-blue-400 bg-blue-50/90">
          <p className="text-lg font-medium text-blue-600">Drop files here to upload</p>
        </div>
      )}
      {children}
    </div>
  );
}
