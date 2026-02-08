import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { ForbiddenError } from '@/lib/api-errors';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const updatePrefsSchema = z.object({
  communicationPrefs: z.object({
    emailNotifications: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
    sessionAlerts: z.boolean().optional(),
    progressMilestones: z.boolean().optional(),
  }),
});

export const GET = withApiHandler(async () => {
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
}, { rateLimit: { windowMs: 60_000, max: 60 } });

export const PATCH = withApiHandler(async (req) => {
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
}, { rateLimit: { windowMs: 60_000, max: 30 } });
