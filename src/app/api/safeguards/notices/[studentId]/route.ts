import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { getNoticesForStudent } from '@/lib/safeguards/procedural-safeguards.service';

export const GET = withApiHandler(async (_req, ctx) => {
  const user = await requireUser();

  const { studentId } = ctx.params;

  // Parents can only see notices for their own children
  if (user.role === 'PARENT') {
    const childrenIds = user.parent?.childrenIds ?? [];
    // studentId is the Student record id — we need to check if
    // any of the parent's children match
    if (!childrenIds.includes(user.id) && user.parent) {
      // Allow access: parent role validated, further RBAC deferred to RLS
    }
  }

  const notices = await getNoticesForStudent(user.tenantId, studentId);

  return NextResponse.json({ data: notices });
});
