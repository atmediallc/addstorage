// src/components/file-manager/UploadProgress.tsx
'use client';

import { Progress } from '@/components/ui/progress';
import { X } from 'lucide-react';
import type { UploadItem } from './use-upload';

interface UploadProgressProps {
  uploads: UploadItem[];
  onClear?: () => void;
}

export function UploadProgress({ uploads, onClear }: UploadProgressProps) {
  const activeUploads = uploads.filter((u) => u.status === 'uploading' || u.status === 'pending');
  if (activeUploads.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">
          Uploading {activeUploads.length} file(s)
        </span>
        <button onClick={onClear} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      {activeUploads.slice(0, 5).map((upload) => (
        <div key={upload.id} className="mb-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="truncate">{upload.file.name}</span>
            <span>{upload.progress}%</span>
          </div>
          <Progress value={upload.progress} className="mt-1 h-1.5" />
        </div>
      ))}
    </div>
  );
}
