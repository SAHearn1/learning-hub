import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { canManageMinorConsent, requiresGuardianForDataRequest } from '@/lib/compliance';
import { appendImmutableAuditLog } from '@/lib/audit';
import { withApiHandler } from '@/lib/api-handler';
import { ForbiddenError, NotFoundError } from '@/lib/api-errors';

const dataRightsSchema = z.object({
  requestType: z.enum(['EXPORT', 'DELETE']),
  subjectUserId: z.string().optional(),
  reason: z.string().max(1000).optional(),
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const actor = await requireUser();
  const payload = dataRightsSchema.parse(await req.json());
  const subjectUserId = payload.subjectUserId ?? actor.id;

  const subject = await db.user.findUnique({
    where: { id: subjectUserId },
    include: {
      student: {
        include: {
          sessions: {
            include: {
              messages: true,
              assessments: true,
            },
          },
          progress: true,
        },
      },
    },
  });

  if (!subject) {
    throw new NotFoundError('Requested user was not found');
  }

  const sameUser = actor.id === subject.id;
  if (!sameUser && subject.tenantId !== actor.tenantId) {
    throw new ForbiddenError('Forbidden');
  }
  if (!sameUser && !canManageMinorConsent(actor.role)) {
    throw new ForbiddenError('Forbidden');
  }

  if (requiresGuardianForDataRequest(subject.isMinor, actor.role)) {
    throw new ForbiddenError('A parent/admin role is required for minor data requests');
  }

  await appendImmutableAuditLog({
    tenantId: subject.tenantId,
    userId: actor.id,
    action: 'DATA_RIGHTS_REQUESTED',
    resource: 'User',
    resourceId: subject.id,
    metadata: {
      requestType: payload.requestType,
      reason: payload.reason,
    },
  });

  if (payload.requestType === 'DELETE') {
    return NextResponse.json({
      success: true,
      status: 'QUEUED',
      message: 'Deletion request logged. Fulfillment requires privacy admin review before irreversible removal.',
    });
  }

  return NextResponse.json({
    success: true,
    export: {
      generatedAt: new Date().toISOString(),
      subject: {
        id: subject.id,
        email: subject.email,
        firstName: subject.firstName,
        lastName: subject.lastName,
        role: subject.role,
        isMinor: subject.isMinor,
        consentStatus: subject.consentStatus,
        createdAt: subject.createdAt,
      },
      learningDataSummary: {
        totalSessions: subject.student?.sessions.length ?? 0,
        totalMessages:
          subject.student?.sessions.reduce((sum, session) => sum + session.messages.length, 0) ?? 0,
        totalAssessments:
          subject.student?.sessions.reduce((sum, session) => sum + session.assessments.length, 0) ?? 0,
        progressRecords: subject.student?.progress.length ?? 0,
      },
    },
  });
});
