import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { OnboardingClient } from './onboarding-client';

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 px-4">
      <OnboardingClient />
    </main>
  );
}
