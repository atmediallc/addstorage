import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <>
      <h2 className="text-center text-2xl font-bold text-gray-900">
        Forgot your password?
      </h2>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
    </>
  );
}
