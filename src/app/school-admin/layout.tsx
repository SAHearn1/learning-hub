import { requirePageUser } from '@/lib/page-auth';

export default async function SchoolAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageUser(['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);
  return <>{children}</>;
}
