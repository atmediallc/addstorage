'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Copy, Link, Shield, Clock, Lock } from 'lucide-react';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: number;
  type: 'file' | 'folder';
  itemName: string;
}

export function ShareDialog({ open, onOpenChange, itemId, type, itemName }: ShareDialogProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [permission, setPermission] = useState<'visitor' | 'editor'>('visitor');
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [expireIn, setExpireIn] = useState<number | undefined>(undefined);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const createShare = trpc.files.createShare.useMutation({
    onSuccess: (data) => {
      setShareUrl(data.url);
      toast('Share link created', 'success');
      utils.files.listShares.invalidate();
    },
    onError: (err) => toast(err.message, 'error'),
  });

  const handleCreate = () => {
    createShare.mutate({
      itemId,
      type,
      permission,
      protected: isProtected,
      password: isProtected ? password : undefined,
      expireIn,
    });
  };

  const copyUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast('Link copied to clipboard', 'success');
    }
  };

  const handleClose = () => {
    setShareUrl(null);
    setPermission('visitor');
    setIsProtected(false);
    setPassword('');
    setExpireIn(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{itemName}"</DialogTitle>
        </DialogHeader>

        {shareUrl ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <Link className="h-4 w-4 text-gray-400" />
              <input
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
              />
              <button onClick={copyUrl} className="rounded p-1 text-gray-400 hover:text-gray-600">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Anyone with this link can {permission === 'editor' ? 'view, download, and upload to' : 'view and download'} this {type}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                <Shield className="mr-1 inline h-4 w-4" />
                Permission
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPermission('visitor')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                    permission === 'visitor'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Visitor (read-only)
                </button>
                <button
                  onClick={() => setPermission('editor')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                    permission === 'editor'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Editor (can upload)
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                <Lock className="mr-1 inline h-4 w-4" />
                Password Protection
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isProtected}
                  onChange={(e) => setIsProtected(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Require password</span>
              </div>
              {isProtected && (
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                <Clock className="mr-1 inline h-4 w-4" />
                Expiration
              </label>
              <select
                value={expireIn ?? ''}
                onChange={(e) => setExpireIn(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Never expires</option>
                <option value="1">1 hour</option>
                <option value="24">24 hours</option>
                <option value="168">7 days</option>
                <option value="720">30 days</option>
              </select>
            </div>
          </div>
        )}

        <DialogFooter>
          <button
            onClick={handleClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {shareUrl ? 'Done' : 'Cancel'}
          </button>
          {!shareUrl && (
            <button
              onClick={handleCreate}
              disabled={createShare.isPending || (isProtected && !password)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createShare.isPending ? 'Creating...' : 'Create Link'}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
