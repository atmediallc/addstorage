'use client';

import { trpc } from '@/lib/trpc';
import { Clock, File, Folder, Upload, Download, Trash2, Share2, Edit, LogIn } from 'lucide-react';
import { PageSkeleton } from '@/components/ui/skeleton';

const actionIcons: Record<string, typeof File> = {
  file_upload: Upload,
  file_download: Download,
  file_delete: Trash2,
  file_move: Edit,
  file_rename: Edit,
  folder_create: Folder,
  folder_delete: Trash2,
  share_create: Share2,
  share_delete: Share2,
  login: LogIn,
};

const actionLabels: Record<string, string> = {
  file_upload: 'Uploaded',
  file_download: 'Downloaded',
  file_delete: 'Deleted',
  file_move: 'Moved',
  file_rename: 'Renamed',
  folder_create: 'Created folder',
  folder_delete: 'Deleted folder',
  share_create: 'Shared',
  share_delete: 'Removed share',
  login: 'Signed in',
};

export default function ActivityPage() {
  const { data: activities, isLoading } = trpc.notifications.getRecentActivity.useQuery({ limit: 50 });

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity</h1>

      {!activities || activities.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <Clock className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No activity yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          {activities.map((activity, i) => {
            const Icon = actionIcons[activity.action] || Clock;
            const label = actionLabels[activity.action] || activity.action;
            return (
              <div
                key={activity.id}
                className={`flex items-center gap-4 px-4 py-3 ${
                  i < activities.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">{label}</span>
                    {activity.resource && (
                      <span className="text-gray-500 dark:text-gray-400">
                        {' '}{activity.resource}
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(activity.createdAt).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
