import { requirePageUser } from '@/lib/page-auth';

export default async function EducatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageUser(['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);
  return <>{children}</>;
}
