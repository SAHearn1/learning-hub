/**
 * Parent Students API
 * Returns list of students associated with parent account
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { ForbiddenError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (user.role !== 'PARENT') {
    throw new ForbiddenError();
  }

  // Get parent record
  const parentRecord = await db.parent.findUnique({
    where: { userId: user.id },
  });

  if (!parentRecord || parentRecord.childrenIds.length === 0) {
    return NextResponse.json({ students: [] });
  }

  // Fetch students by their IDs stored in childrenIds
  const students = await db.user.findMany({
    where: { id: { in: parentRecord.childrenIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  return NextResponse.json({ students });
});
