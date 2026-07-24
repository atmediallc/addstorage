import { AnalyticsDashboard } from '@/components/admin/analytics-dashboard';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Overview of system usage and statistics
        </p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
