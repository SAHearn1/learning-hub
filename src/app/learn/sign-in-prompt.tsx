import Link from 'next/link';
import Image from 'next/image';

export function SignInPrompt() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-12">
      <div className="mx-auto max-w-md text-center">
        <Image
          src="/brand/rwfw-seal.png"
          alt="RootWork Framework"
          width={80}
          height={80}
          className="mx-auto mb-6 rounded-full"
        />
        <h1 className="mb-3 text-2xl font-bold text-primary-900">
          Sign in to Start Learning
        </h1>
        <p className="mb-8 text-neutral-600">
          Sign in to your account to access personalized learning sessions, track
          your progress, and explore the 5R Framework.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/sign-in"
            className="inline-flex w-full max-w-xs items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: '#0C3B2E' }}
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex w-full max-w-xs items-center justify-center rounded-lg border-2 px-6 py-3 text-sm font-semibold transition-colors"
            style={{ borderColor: '#0C3B2E', color: '#0C3B2E' }}
          >
            Create Account
          </Link>
          <Link
            href="/"
            className="mt-2 text-sm text-neutral-500 hover:text-neutral-700"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
