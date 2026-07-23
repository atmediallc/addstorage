// src/components/file-manager/UploadProgress.tsx
'use client';

import { useState, useCallback } from 'react';
import { X } from 'lucide-react';

interface UploadItem {
  id: string;
  name: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

const uploads: UploadItem[] = [];

export function UploadProgress() {
  const [, forceUpdate] = useState(0);

  const removeUpload = useCallback((id: string) => {
    const idx = uploads.findIndex((u) => u.id === id);
    if (idx !== -1) {
      uploads.splice(idx, 1);
      forceUpdate((n) => n + 1);
    }
  }, []);

  if (uploads.length === 0) return null;

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="space-y-2">
        {uploads.map((upload) => (
          <div key={upload.id} className="flex items-center gap-3 text-sm">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="truncate">{upload.name}</span>
                <button onClick={() => removeUpload(upload.id)} className="ml-2 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all ${
                    upload.status === 'error' ? 'bg-red-500' : upload.status === 'done' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
