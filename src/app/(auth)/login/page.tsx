import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <>
      <h2 className="text-center text-2xl font-bold text-gray-900">
        Sign in to TutisCloud
      </h2>
      <div className="mt-8">
        <LoginForm />
      </div>
    </>
  );
}
