'use client';

import { trpc } from '@/lib/trpc';
import { generateUserReport, generateFileReport, generateShareReport, downloadFile } from '@/lib/export';
import { useToast } from '@/components/ui/toast';
import { Download, Users, FolderOpen, Share2, Clock } from 'lucide-react';

type ReportType = 'users' | 'files' | 'shares';

const reportOptions: Array<{
  type: ReportType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    type: 'users',
    label: 'User Report',
    description: 'All users with roles, storage, and file counts',
    icon: Users,
  },
  {
    type: 'files',
    label: 'File Inventory',
    description: 'Complete list of all files with types and sizes',
    icon: FolderOpen,
  },
  {
    type: 'shares',
    label: 'Share Links',
    description: 'All shared links with permissions and status',
    icon: Share2,
  },
];

export function ReportManager() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const generateReport = async (type: ReportType) => {
    try {
      let csv = '';
      let filename = '';

      switch (type) {
        case 'users': {
          const data = await utils.client.admin.exportUsers.query();
          csv = generateUserReport(data);
          filename = `users-report-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        }
        case 'files': {
          const data = await utils.client.admin.exportFiles.query();
          csv = generateFileReport(data);
          filename = `files-report-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        }
        case 'shares': {
          const data = await utils.client.admin.exportShares.query();
          csv = generateShareReport(data);
          filename = `shares-report-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        }
      }

      if (csv) {
        downloadFile(csv, filename);
        toast('Report downloaded', 'success');
      } else {
        toast('No data to export', 'info');
      }
    } catch (err) {
      toast('Failed to generate report', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Generate Reports</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Export data as CSV files for analysis
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {reportOptions.map((opt) => (
          <div
            key={opt.type}
            className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2 dark:bg-blue-900/20">
                <opt.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{opt.description}</p>
              </div>
            </div>
            <button
              onClick={() => generateReport(opt.type)}
              className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="h-4 w-4" />
          <span>Reports are generated in real-time from current data</span>
        </div>
      </div>
    </div>
  );
}
