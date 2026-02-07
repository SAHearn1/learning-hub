import { parentNavItems } from '@/config/navigation';
import { PortalHome } from '@/components/navigation/portal-home';

export default function ParentDashboardPage() {
  return (
    <PortalHome
      title="Parent Workspace"
      description="Stay connected to learner growth and configure home support settings."
      items={parentNavItems}
    />
  );
}
