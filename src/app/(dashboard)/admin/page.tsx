'use client';

import { trpc } from '@/lib/trpc';
import { Users, HardDrive, Folder, File } from 'lucide-react';
import { PageSkeleton } from '@/components/ui/skeleton';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = trpc.admin.getDashboardStats.useQuery();

  if (isLoading) return <PageSkeleton />;
  if (!stats) return null;

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-600' },
    { label: 'Total Files', value: stats.totalFiles, icon: File, color: 'text-green-600' },
    { label: 'Total Folders', value: stats.totalFolders, icon: Folder, color: 'text-yellow-600' },
    { label: 'Storage Used', value: formatBytes(stats.storageUsed), icon: HardDrive, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{card.value}</p>
              </div>
              <card.icon className={`h-8 w-8 ${card.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Registrations</h2>
        {stats.recentUsers.length === 0 ? (
          <p className="text-sm text-gray-500">No users yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {stats.recentUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{user.email}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
