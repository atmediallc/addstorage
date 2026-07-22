// src/hooks/use-auth.ts
'use client';

import { useSession, signOut } from '@/server/auth/client';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

// Better Auth infers session types from its internal schema.
// Our Prisma User model has additional fields (role, avatar) that Better Auth
// stores via additionalFields but doesn't expose on the inferred type.
// This type extends the session user with our known additional fields.
interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  avatar: string | null;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function useAuth() {
  const { data: session, isPending, error } = useSession();
  const router = useRouter();

  const rawUser = session?.user as unknown as SessionUser | undefined;
  const user = rawUser ?? null;
  const isAuthenticated = !!session;
  const role = user?.role ?? null;

  const logout = useCallback(async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  }, [router]);

  return {
    session: session as unknown as { user: SessionUser; session: { id: string } } | null,
    user,
    isAuthenticated,
    isPending,
    error,
    role,
    logout,
  };
}
