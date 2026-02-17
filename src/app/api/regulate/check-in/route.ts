import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { appendImmutableAuditLog } from '@/lib/audit';
import { ForbiddenError } from '@/lib/api-errors';

const checkInSchema = z.object({
  mood: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  selectedStrategy: z.string().min(1).max(120),
  notes: z.string().max(500).optional(),
});

export const POST = withApiHandler(async (req) => {
  const user = await requireUser();

  if (user.role !== 'STUDENT' || !user.student) {
    throw new ForbiddenError('Student profile not found');
  }

  const body = checkInSchema.parse(await req.json());

  await appendImmutableAuditLog({
    tenantId: user.tenantId,
    userId: user.id,
    action: 'REGULATION_CHECK_IN',
    resource: 'CALM_CORNER',
    resourceId: user.student.id,
    metadata: body,
  });

  const recommendation =
    body.mood <= 2 || body.energy <= 2
      ? 'Take a longer break and use a breathing strategy before returning to Learn.'
      : 'You are ready for a focused work block. Start a short guided session in Learn.';

  return NextResponse.json({
    data: {
      recommendation,
      nextSteps: [
        '/regulate',
        '/learn',
      ],
    },
  });
});
