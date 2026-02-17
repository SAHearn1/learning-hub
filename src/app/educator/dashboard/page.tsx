import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { educatorNavItems } from '@/config/navigation';
import { PortalHome } from '@/components/navigation/portal-home';

export default async function EducatorDashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <PortalHome
      title="Educator Workspace"
      description="Monitor classrooms, track student regulation trends, and review learning outcomes."
      items={educatorNavItems}
    />
  );
}
