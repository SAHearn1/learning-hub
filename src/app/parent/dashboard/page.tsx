import { parentNavItems } from '@/config/navigation';
import { PortalHome } from '@/components/navigation/portal-home';
import { requirePageUser } from '@/lib/page-auth';

export default async function ParentDashboardPage() {
  await requirePageUser(['PARENT']);

  return (
    <PortalHome
      title="Parent Workspace"
      description="Stay connected to learner growth and configure home support settings."
      items={parentNavItems}
    />
  );
}
