import { Header } from '@/components/layout/header';
import { StorageQuota } from '@/components/file-manager/StorageQuota';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex flex-1">
        <aside className="w-64 border-r border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <nav className="space-y-1">
            <a
              href="/files"
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Files
            </a>
            <a
              href="/favourites"
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Favourites
            </a>
            <a
              href="/shared"
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Shared
            </a>
            <a
              href="/trash"
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Trash
            </a>
            <a
              href="/billing"
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Billing
            </a>
            <a
              href="/settings"
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Settings
            </a>
            <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
            <a
              href="/admin"
              className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Admin
            </a>
          </nav>
          <StorageQuota />
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
