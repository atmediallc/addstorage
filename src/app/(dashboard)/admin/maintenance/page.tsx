'use client';

import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';
import { Server, Database, RefreshCw, Activity } from 'lucide-react';

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${mins}m`;
}

export default function MaintenancePage() {
  const { toast } = useToast();
  const { data: systemInfo, isLoading } = trpc.admin.getSystemInfo.useQuery();
  const { data: health } = trpc.admin.healthCheck.useQuery();

  const clearCache = trpc.admin.clearCache.useMutation({
    onSuccess: () => toast('Cache cleared', 'success'),
    onError: (err) => toast(err.message, 'error'),
  });

  if (isLoading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">System Maintenance</h1>

      {/* Health Status */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-semibold">Health Status</h2>
          {health && (
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
              health.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {health.status}
            </span>
          )}
        </div>

        {health && (
          <div className="space-y-2">
            {Object.entries(health.checks).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{key}</span>
                <span className={`text-sm font-medium ${
                  value === 'ok' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {value}
                </span>
              </div>
            ))}
            <p className="text-xs text-gray-400">Last checked: {new Date(health.timestamp).toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* System Info */}
      {systemInfo && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">System Information</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-gray-500">App Version</p>
              <p className="text-sm font-semibold text-gray-900">{systemInfo.version}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Node.js</p>
              <p className="text-sm font-semibold text-gray-900">{systemInfo.nodeVersion}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Platform</p>
              <p className="text-sm font-semibold text-gray-900">{systemInfo.platform}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Uptime</p>
              <p className="text-sm font-semibold text-gray-900">{formatUptime(systemInfo.uptime)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Database Stats */}
      {systemInfo && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-semibold">Database Statistics</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{systemInfo.totalUsers}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Files</p>
              <p className="text-2xl font-semibold text-gray-900">{systemInfo.totalFiles}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Folders</p>
              <p className="text-2xl font-semibold text-gray-900">{systemInfo.totalFolders}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Subscriptions</p>
              <p className="text-2xl font-semibold text-gray-900">{systemInfo.totalSubscriptions}</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Maintenance Actions</h2>
        <div className="space-y-3">
          <button
            onClick={() => clearCache.mutate()}
            disabled={clearCache.isPending}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${clearCache.isPending ? 'animate-spin' : ''}`} />
            {clearCache.isPending ? 'Clearing...' : 'Clear Cache'}
          </button>
        </div>
      </div>
    </div>
  );
}
