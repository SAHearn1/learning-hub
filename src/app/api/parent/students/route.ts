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

  // Get parent record with children
  const parentRecord = await db.parent.findUnique({
    where: { userId: user.id },
    include: {
      children: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isMinor: true,
              dateOfBirth: true,
              consentStatus: true,
              consentGrantedAt: true,
            },
          },
        },
      },
    },
  });

  if (!parentRecord) {
    return NextResponse.json({ students: [] });
  }

  const students = parentRecord.children.map((child) => child.user);

  return NextResponse.json({ students });
});
