import { LoginForm } from '@/components/auth/login-form';
import { Suspense } from 'react';

export default function LoginPage() {
  return (
    <>
      <h2 className="text-center text-2xl font-bold text-gray-900">
        Sign in to TutisCloud
      </h2>
      <div className="mt-8">
        <Suspense fallback={<div className="text-center py-4 text-sm text-gray-500">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </>
  );
}
