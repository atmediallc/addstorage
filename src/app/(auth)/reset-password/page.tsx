import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export default function ResetPasswordPage() {
  return (
    <>
      <h2 className="text-center text-2xl font-bold text-gray-900">
        Reset your password
      </h2>
      <div className="mt-8">
        <ResetPasswordForm />
      </div>
    </>
  );
}
