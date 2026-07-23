// src/components/auth/unverified-banner.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

export function UnverifiedBanner() {
  const { user, isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isAuthenticated || !user || user.emailVerified || dismissed) {
    return null;
  }

  async function resendVerification() {
    setSending(true);
    try {
      await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user!.email }),
      });
      setSent(true);
    } catch {
      // Silent fail
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex items-center justify-between border-b border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
      <span>
        Please verify your email address.{' '}
        {sent ? (
          <span className="font-medium">Verification email sent!</span>
        ) : (
          <button
            onClick={resendVerification}
            disabled={sending}
            className="font-medium underline hover:no-underline disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Resend verification email'}
          </button>
        )}
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-4 text-yellow-600 hover:text-yellow-800"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
