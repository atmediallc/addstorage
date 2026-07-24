// src/components/layout/header.tsx
'use client';

import { useAuth } from '@/hooks/use-auth';
import { can } from '@/server/auth/rbac/ability';
import { UnverifiedBanner } from '@/components/auth/unverified-banner';
import { useTheme } from '@/components/theme-provider';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Sun, Moon, Monitor } from 'lucide-react';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  if (!isAuthenticated || !user) return null;

  const ability = can({ role: user.role });
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <UnverifiedBanner />
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-900">
        <a href="/files" className="text-lg font-bold text-gray-900 dark:text-white">
          TutisCloud
        </a>

        <div className="flex items-center gap-4">
          {ability.atLeast('admin') && (
            <a
              href="/admin"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Admin
            </a>
          )}

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
            className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
            title={`Current: ${theme}`}
          >
            {theme === 'dark' ? (
              <Moon className="h-5 w-5" />
            ) : theme === 'system' ? (
              <Monitor className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </button>

          <NotificationBell />

          <LocaleSwitcher />

          <div className="relative group">
            <button className="flex items-center gap-2 rounded-md p-1.5 hover:bg-gray-100">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                  {initials}
                </span>
              )}
              <div className="hidden text-left text-sm md:block">
                <div className="font-medium text-gray-900">{user.name}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>
            </button>

            <div className="invisible absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg group-hover:visible dark:border-gray-700 dark:bg-gray-900">
              <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 capitalize dark:bg-gray-800 dark:text-gray-300">
                  {user.role}
                </span>
              </div>
              <a
                href="/settings"
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Settings
              </a>
              <a
                href="/settings/sessions"
                className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Sessions
              </a>
              <hr className="my-1" />
              <button
                onClick={logout}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
