import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
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

export async function GET() {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { parent: true },
  });
  if (!user || user.role !== 'PARENT' || !user.parent) {
    return NextResponse.json({ error: 'Parent profile not found' }, { status: 403 });
  }

  return NextResponse.json({
    data: {
      childrenIds: user.parent.childrenIds,
      communicationPrefs: user.parent.communicationPrefs,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { parent: true },
  });
  if (!user || user.role !== 'PARENT' || !user.parent) {
    return NextResponse.json({ error: 'Parent profile not found' }, { status: 403 });
  }

  let body;
  try {
    body = updatePrefsSchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.errors.map(e => e.message).join(', ') : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const updated = await db.parent.update({
    where: { id: user.parent.id },
    data: { communicationPrefs: body.communicationPrefs },
  });

  return NextResponse.json({ data: updated });
}
