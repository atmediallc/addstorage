import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Suspense } from 'react';

export default function ResetPasswordPage() {
  return (
    <>
      <h2 className="text-center text-2xl font-bold text-gray-900">
        Reset your password
      </h2>
      <div className="mt-8">
        <Suspense fallback={<div className="text-center py-4 text-sm text-gray-500">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </>
  );
}
