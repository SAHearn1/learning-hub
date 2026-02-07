import { educatorNavItems } from '@/config/navigation';
import { PortalHome } from '@/components/navigation/portal-home';

export default function EducatorDashboardPage() {
  return (
    <PortalHome
      title="Educator Workspace"
      description="Monitor classrooms, track student regulation trends, and review learning outcomes."
      items={educatorNavItems}
    />
  );
}
