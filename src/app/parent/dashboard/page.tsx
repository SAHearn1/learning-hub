import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { parentNavItems } from '@/config/navigation';
import { PortalHome } from '@/components/navigation/portal-home';

export default async function ParentDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <PortalHome
      title="Parent Workspace"
      description="Stay connected to learner growth and configure home support settings."
      items={parentNavItems}
    />
  );
}
