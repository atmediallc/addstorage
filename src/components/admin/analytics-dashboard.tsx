'use client';

import { trpc } from '@/lib/trpc';
import { Users, Files, FolderTree, HardDrive, Share2, UserPlus } from 'lucide-react';

export function AnalyticsDashboard() {
  const { data: overview, isLoading } = trpc.admin.analyticsOverview.useQuery();
  const { data: userGrowth } = trpc.admin.analyticsUserGrowth.useQuery();
  const { data: fileTypes } = trpc.admin.analyticsFileTypeDistribution.useQuery();
  const { data: storageByUser } = trpc.admin.analyticsStorageByUser.useQuery();
  const { data: shareStats } = trpc.admin.analyticsShareStats.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} label="Total Users" value={overview?.totalUsers ?? 0} color="blue" />
        <StatCard icon={UserPlus} label="New Users (7d)" value={overview?.recentUsers ?? 0} color="green" />
        <StatCard icon={Files} label="Total Files" value={overview?.totalFiles ?? 0} color="purple" />
        <StatCard icon={FolderTree} label="Total Folders" value={overview?.totalFolders ?? 0} color="yellow" />
        <StatCard icon={HardDrive} label="Storage Allocated" value={`${overview?.totalStorageGB ?? 0} GB`} color="orange" />
        <StatCard icon={Share2} label="Active Shares" value={overview?.activeShares ?? 0} color="pink" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* User Growth */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">User Growth (30d)</h3>
          <SimpleBarChart data={userGrowth ?? []} />
        </div>

        {/* File Types */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">File Types</h3>
          <DonutChart data={fileTypes ?? []} />
        </div>
      </div>

      {/* Storage & Shares */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Storage by User */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Storage by User</h3>
          <div className="space-y-2">
            {(storageByUser ?? []).slice(0, 8).map((user) => (
              <div key={user.userId} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{user.name}</p>
                  <p className="text-[10px] text-gray-500">{user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{user.fileCount} files</p>
                  <p className="text-[10px] text-gray-500">{user.storageGB} GB</p>
                </div>
              </div>
            ))}
            {(!storageByUser || storageByUser.length === 0) && (
              <p className="py-4 text-center text-xs text-gray-500">No data yet</p>
            )}
          </div>
        </div>

        {/* Share Stats */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Share Statistics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Total shares</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{shareStats?.total ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Active</span>
              <span className="text-sm font-semibold text-green-600">{shareStats?.active ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Password protected</span>
              <span className="text-sm font-semibold text-blue-600">{shareStats?.passwordProtected ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Expired</span>
              <span className="text-sm font-semibold text-red-600">{shareStats?.expired ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    pink: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400',
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function SimpleBarChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-gray-500">No data yet</p>;
  }
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-1" style={{ height: 120 }}>
      {data.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.date}: ${d.count}`}>
          <div
            className="w-full rounded-t bg-blue-500 transition-all dark:bg-blue-400"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }}
          />
          <span className="text-[8px] text-gray-400">{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data }: { data: Array<{ type: string; count: number }> }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-gray-500">No data yet</p>;
  }
  const total = data.reduce((s, d) => s + d.count, 0);
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-gray-400'];

  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="flex h-4 overflow-hidden rounded-full">
        {data.map((d, i) => (
          <div
            key={d.type}
            className={`${colors[i % colors.length]}`}
            style={{ width: `${(d.count / total) * 100}%` }}
            title={`${d.type}: ${d.count}`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {data.map((d, i) => (
          <div key={d.type} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-full ${colors[i % colors.length]}`} />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {d.type} ({d.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
