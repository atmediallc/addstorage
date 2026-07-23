export default function VerifyEmailPage() {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900">Email Verified</h2>
      <p className="mt-4 text-gray-600">
        Your email has been verified. You can now access all features.
      </p>
      <a
        href="/files"
        className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Go to Files
      </a>
    </div>
  );
}
