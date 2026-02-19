import { educatorNavItems } from '@/config/navigation';
import { PortalHome } from '@/components/navigation/portal-home';
import { requirePageUser } from '@/lib/page-auth';

export default async function EducatorDashboardPage() {
  await requirePageUser(['EDUCATOR', 'SCHOOL_ADMIN']);

  return (
    <PortalHome
      title="Educator Workspace"
      description="Monitor classrooms, track student regulation trends, and review learning outcomes."
      items={educatorNavItems}
    />
  );
}
