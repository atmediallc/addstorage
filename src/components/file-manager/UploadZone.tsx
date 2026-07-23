// src/components/file-manager/UploadZone.tsx
'use client';

import { useState, useCallback, useRef, type ReactNode } from 'react';
import { Upload } from 'lucide-react';

interface UploadZoneProps {
  children: ReactNode;
}

export function UploadZone({ children }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Upload logic will be wired in UploadProgress task
      console.log('Files dropped:', files.map((f) => f.name));
    }
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      console.log('Files selected:', files.map((f) => f.name));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`relative flex-1 ${isDragOver ? 'bg-blue-50' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      {isDragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-blue-400 bg-blue-50/80">
          <div className="flex flex-col items-center gap-2 text-blue-600">
            <Upload className="h-8 w-8" />
            <span className="text-sm font-medium">Drop files here to upload</span>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
