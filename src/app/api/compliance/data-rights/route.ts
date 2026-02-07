import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { canManageMinorConsent, requiresGuardianForDataRequest } from '@/lib/compliance';

const dataRightsSchema = z.object({
  requestType: z.enum(['EXPORT', 'DELETE']),
  subjectUserId: z.string().optional(),
  reason: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  try {
    const actor = await requireUser();
    const payload = dataRightsSchema.parse(await request.json());
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
      return NextResponse.json({ error: 'Requested user was not found' }, { status: 404 });
    }

    const sameUser = actor.id === subject.id;
    if (!sameUser && !canManageMinorConsent(actor.role)) {
      return NextResponse.json({ error: 'Forbidden for requested subject' }, { status: 403 });
    }

    if (requiresGuardianForDataRequest(subject.isMinor, actor.role)) {
      return NextResponse.json({ error: 'A parent/admin role is required for minor data requests' }, { status: 403 });
    }

    await db.auditLog.create({
      data: {
        tenantId: subject.tenantId,
        userId: actor.id,
        action: 'DATA_RIGHTS_REQUESTED',
        resource: 'User',
        resourceId: subject.id,
        metadata: {
          requestType: payload.requestType,
          reason: payload.reason,
        },
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request payload', issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unable to process data-rights request' }, { status: 500 });
  }
}
