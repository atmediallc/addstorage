'use client';

import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';

interface SessionItem {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  isCurrent: boolean;
}

export default function SessionsPage() {
  const { toast } = useToast();
  const { data: sessions, isLoading } = trpc.auth.sessions.useQuery() as {
    data: SessionItem[] | undefined;
    isLoading: boolean;
  };

  const revokeSession = trpc.auth.revokeSession.useMutation({
    onSuccess: () => {
      toast('Session revoked', 'success');
    },
    onError: () => {
      toast('Failed to revoke session', 'error');
    },
  });

  const revokeAll = trpc.auth.revokeAllSessions.useMutation({
    onSuccess: () => {
      toast('All other sessions revoked', 'success');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Active Sessions</h1>
        <button
          onClick={() => revokeAll.mutate()}
          disabled={revokeAll.isPending}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Revoke all others
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {sessions?.map((session) => (
          <div
            key={session.id}
            className="rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {session.userAgent ?? 'Unknown device'}
                  </span>
                  {session.isCurrent && (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Current
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  IP: {session.ipAddress ?? 'Unknown'} · Last active:{' '}
                  {typeof session.updatedAt === 'string'
                    ? new Date(session.updatedAt).toLocaleDateString()
                    : session.updatedAt.toLocaleDateString()}
                </div>
              </div>
              {!session.isCurrent && (
                <button
                  onClick={() =>
                    revokeSession.mutate({ sessionId: session.id })
                  }
                  disabled={revokeSession.isPending}
                  className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Revoke
                </button>
              )}
            </div>
          </div>
        ))}

        {sessions && sessions.length === 0 && (
          <p className="text-sm text-gray-500">No active sessions.</p>
        )}
      </div>
    </div>
  );
}
