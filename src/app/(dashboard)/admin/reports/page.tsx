import { ReportManager } from '@/components/admin/report-manager';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Exports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Generate and download data reports
        </p>
      </div>
      <ReportManager />
    </div>
  );
}
