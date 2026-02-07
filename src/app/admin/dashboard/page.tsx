import { adminNavItems } from '@/config/navigation';
import { PortalHome } from '@/components/navigation/portal-home';

export default function AdminDashboardPage() {
  return (
    <PortalHome
      title="Admin Workspace"
      description="Platform controls, operational health, and governance tools."
      items={adminNavItems}
    />
  );
}
