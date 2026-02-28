import { requirePageUser } from '@/lib/page-auth';

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageUser(['PARENT']);
  return <>{children}</>;
}
