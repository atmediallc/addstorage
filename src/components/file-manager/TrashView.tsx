'use client';

import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';
import { RotateCcw, Trash2, Folder, File } from 'lucide-react';

export function TrashView() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.files.listTrash.useQuery();

  const restore = trpc.files.restoreItem.useMutation({
    onSuccess: () => {
      toast('Item restored', 'success');
      utils.files.listTrash.invalidate();
    },
    onError: (err) => toast(err.message, 'error'),
  });

  const permanentDelete = trpc.files.permanentDelete.useMutation({
    onSuccess: () => {
      toast('Item permanently deleted', 'success');
      utils.files.listTrash.invalidate();
    },
    onError: (err) => toast(err.message, 'error'),
  });

  const emptyTrash = trpc.files.emptyTrash.useMutation({
    onSuccess: () => {
      toast('Trash emptied', 'success');
      utils.files.listTrash.invalidate();
    },
    onError: (err) => toast(err.message, 'error'),
  });

  if (isLoading) return <div className="p-4">Loading...</div>;

  const items = [
    ...(data?.folders.map(f => ({ ...f, type: 'folder' as const })) ?? []),
    ...(data?.files.map(f => ({ ...f, type: 'file' as const })) ?? []),
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <h1 className="text-lg font-semibold">Trash</h1>
        {items.length > 0 && (
          <button
            onClick={() => emptyTrash.mutate({})}
            disabled={emptyTrash.isPending}
            className="flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Empty Trash
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {items.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-gray-500">
            Trash is empty
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.uniqueId} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-3">
                  {item.type === 'folder' ? (
                    <Folder className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <File className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{item.name ?? 'Unnamed'}</p>
                    <p className="text-xs text-gray-500">
                      Deleted {new Date(item.deletedAt!).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => restore.mutate({ uniqueId: item.uniqueId, type: item.type })}
                    disabled={restore.isPending}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-green-600"
                    title="Restore"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => permanentDelete.mutate({ uniqueId: item.uniqueId, type: item.type })}
                    disabled={permanentDelete.isPending}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete permanently"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
