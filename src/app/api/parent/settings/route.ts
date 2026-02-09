import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { ForbiddenError } from '@/lib/api-errors';

const updatePrefsSchema = z.object({
  communicationPrefs: z.object({
    emailNotifications: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
    sessionAlerts: z.boolean().optional(),
    progressMilestones: z.boolean().optional(),
  }),
});

export const GET = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (user.role !== 'PARENT' || !user.parent) {
    throw new ForbiddenError('Parent profile not found');
  }

  return NextResponse.json({
    data: {
      childrenIds: user.parent.childrenIds,
      communicationPrefs: user.parent.communicationPrefs,
    },
  });
});

export const PATCH = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (user.role !== 'PARENT' || !user.parent) {
    throw new ForbiddenError('Parent profile not found');
  }

  const body = updatePrefsSchema.parse(await req.json());

  const updated = await db.parent.update({
    where: { id: user.parent.id },
    data: { communicationPrefs: body.communicationPrefs },
  });

  return NextResponse.json({ data: updated });
});
