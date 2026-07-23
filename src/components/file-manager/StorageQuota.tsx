// src/components/file-manager/StorageQuota.tsx
'use client';

import { trpc } from '@/lib/trpc';
import { HardDrive } from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function StorageQuota() {
  const { data: quota } = trpc.files.getQuota.useQuery();

  if (!quota) return null;

  const percentage = quota.limit > 0 ? Math.min((quota.used / quota.limit) * 100, 100) : 0;

  return (
    <div className="mt-4 rounded-lg border border-gray-200 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
        <HardDrive className="h-4 w-4" />
        <span>Storage</span>
      </div>
      <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all ${
            percentage > 90 ? 'bg-red-500' : percentage > 70 ? 'bg-yellow-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        {formatBytes(quota.used)} of {quota.capacity} GB used
      </p>
    </div>
  );
}
