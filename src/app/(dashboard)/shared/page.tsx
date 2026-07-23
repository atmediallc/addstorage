'use client';

import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';
import { Link2, Copy, Trash2, Shield, Lock, Calendar, ExternalLink } from 'lucide-react';
import { PageSkeleton } from '@/components/ui/skeleton';

export default function SharedPage() {
  const { toast } = useToast();
  const { data: shares, isLoading } = trpc.files.listShares.useQuery();
  const utils = trpc.useUtils();

  const deleteShare = trpc.files.deleteShare.useMutation({
    onSuccess: () => {
      toast('Share deleted', 'success');
      utils.files.listShares.invalidate();
    },
    onError: (err) => toast(err.message, 'error'),
  });

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast('Link copied!', 'success');
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shared Links</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {shares?.length ?? 0} link(s)
        </span>
      </div>

      {!shares || shares.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <Link2 className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No shared links yet.</p>
          <p className="text-xs text-gray-400">Right-click a file or folder to create a share link.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shares.map((share) => {
            const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${share.token}`;
            return (
              <div
                key={share.id}
                className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                  <Link2 className="h-5 w-5 text-blue-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {share.type === 'folder' ? '📁' : '📄'} {share.token}
                    </span>
                    {share.permission === 'editor' && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <Shield className="h-2.5 w-2.5" />
                        Editor
                      </span>
                    )}
                    {share.protected && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <Lock className="h-2.5 w-2.5" />
                        Protected
                      </span>
                    )}
                    {share.expireIn && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        <Calendar className="h-2.5 w-2.5" />
                        {share.expireIn}h
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">{shareUrl}</p>
                </div>

                <div className="flex items-center gap-1">
                  <a
                    href={`/s/${share.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-1.5 text-gray-400 hover:text-blue-600"
                    title="Open"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => copyLink(shareUrl)}
                    className="rounded p-1.5 text-gray-400 hover:text-green-600"
                    title="Copy link"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this share link?')) {
                        deleteShare.mutate({ shareId: share.id });
                      }
                    }}
                    className="rounded p-1.5 text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
