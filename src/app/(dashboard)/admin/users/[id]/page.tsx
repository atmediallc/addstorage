'use client';

import { use } from 'react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const userId = Number(id);
  const { toast } = useToast();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: user, isLoading } = trpc.admin.getUser.useQuery({ userId });
  const changeRole = trpc.admin.changeUserRole.useMutation({
    onSuccess: () => { toast('Role updated', 'success'); utils.admin.getUser.invalidate({ userId }); },
    onError: (err) => toast(err.message, 'error'),
  });
  const changeStorage = trpc.admin.changeStorageCapacity.useMutation({
    onSuccess: () => { toast('Storage updated', 'success'); utils.admin.getUser.invalidate({ userId }); },
    onError: (err) => toast(err.message, 'error'),
  });
  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: () => { toast('User deleted', 'success'); router.push('/admin/users'); },
    onError: (err) => toast(err.message, 'error'),
  });

  if (isLoading) return <div className="p-4">Loading...</div>;
  if (!user) return <div className="p-4">User not found</div>;

  const capacity = user.settings?.storageCapacity ?? 5;
  const storagePercent = capacity > 0 ? Math.min((user.storageUsed / (capacity * 1024 * 1024 * 1024)) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="rounded p-1 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">User: {user.name}</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Profile</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Name</dt>
              <dd className="text-sm font-medium text-gray-900">{user.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="text-sm font-medium text-gray-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Joined</dt>
              <dd className="text-sm font-medium text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        {/* Role & Storage */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Access</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
              <select
                value={user.role}
                onChange={(e) => changeRole.mutate({ userId, role: e.target.value as 'admin' | 'user' })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Storage Capacity (GB)</label>
              <input
                type="number"
                defaultValue={capacity}
                min={1}
                max={1000}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val > 0) changeStorage.mutate({ userId, capacity: val });
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Storage Usage</label>
              <div className="h-2.5 w-full rounded-full bg-gray-200">
                <div
                  className={`h-2.5 rounded-full ${
                    storagePercent > 90 ? 'bg-red-500' : storagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {formatBytes(user.storageUsed)} of {capacity} GB ({storagePercent.toFixed(1)}%)
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Statistics</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Files</dt>
              <dd className="text-sm font-medium text-gray-900">{user.fileCount}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Folders</dt>
              <dd className="text-sm font-medium text-gray-900">{user.folderCount}</dd>
            </div>
          </dl>
        </div>

        {/* Danger Zone */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-red-800">Danger Zone</h2>
          <p className="mb-4 text-sm text-red-600">
            Permanently delete this user and all their data. This action cannot be undone.
          </p>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this user?')) {
                deleteUser.mutate({ userId });
              }
            }}
            disabled={deleteUser.isPending}
            className="flex items-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {deleteUser.isPending ? 'Deleting...' : 'Delete User'}
          </button>
        </div>
      </div>
    </div>
  );
}
