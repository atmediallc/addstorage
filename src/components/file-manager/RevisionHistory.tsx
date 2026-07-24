'use client';

import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, RotateCcw, File } from 'lucide-react';

interface RevisionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: number;
  fileName: string;
}

export function RevisionHistory({ open, onOpenChange, fileId, fileName }: RevisionHistoryProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data: versions, isLoading } = trpc.files.getVersions.useQuery(
    { fileId },
    { enabled: open },
  );

  const restore = trpc.files.restoreVersion.useMutation({
    onSuccess: () => {
      toast('Version restored', 'success');
      utils.files.listFiles.invalidate();
      onOpenChange(false);
    },
    onError: (err) => toast(err.message, 'error'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Revision History — {fileName}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading versions...</div>
          ) : !versions || versions.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              No version history available. Versions are created when files are re-uploaded.
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((version, i) => (
                <div
                  key={version.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <File className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Version {version.version}
                      </span>
                      {i === 0 && (
                        <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Current
                        </span>
                      )}
                    </div>
                    {version.comment && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{version.comment}</p>
                    )}
                    <p className="text-[10px] text-gray-400">
                      {new Date(version.createdAt).toLocaleString()}
                      {version.filesize && ` • ${formatSize(version.filesize)}`}
                    </p>
                  </div>
                  {i > 0 && (
                    <button
                      onClick={() => restore.mutate({ versionId: version.id })}
                      disabled={restore.isPending}
                      className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restore
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatSize(size: string): string {
  const bytes = Number(size);
  if (isNaN(bytes)) return size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
