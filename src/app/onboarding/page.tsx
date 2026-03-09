import { requirePageUser } from '@/lib/page-auth';
import { OnboardingClient } from './onboarding-client';

export default async function OnboardingPage() {
  await requirePageUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 px-4">
      <OnboardingClient />
    </main>
  );
}
