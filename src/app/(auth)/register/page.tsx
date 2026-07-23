import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <>
      <h2 className="text-center text-2xl font-bold text-gray-900">
        Create your account
      </h2>
      <div className="mt-8">
        <RegisterForm />
      </div>
    </>
  );
}
