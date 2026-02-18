import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withApiHandler } from '@/lib/api-handler';
import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
} from '@/lib/api-errors';

const reviewSchema = z.object({
  assessmentId: z.string().min(1),
  rubricScore: z.number().min(0).max(100),
  comments: z.string().min(1).max(2000),
});

const ALLOWED_ROLES = ['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'] as const;

async function requireReviewer() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  if (!ALLOWED_ROLES.includes(user.role as typeof ALLOWED_ROLES[number])) {
    throw new ForbiddenError();
  }

  return user;
}

export const GET = withApiHandler(async () => {
  const user = await requireReviewer();

  const assessments = await db.assessment.findMany({
    where: {
      session: { tenantId: user.tenantId },
      studentResponse: { not: null },
    },
    include: {
      session: {
        include: {
          student: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    data: assessments.map((assessment) => ({
      id: assessment.id,
      type: assessment.type,
      question: assessment.question,
      score: assessment.score,
      feedback: assessment.feedback,
      studentResponse: assessment.studentResponse,
      metadata: assessment.metadata,
      createdAt: assessment.createdAt,
      studentName: `${assessment.session.student.user.firstName} ${assessment.session.student.user.lastName}`,
    })),
  });
}, { rateLimit: { windowMs: 60_000, max: 60 } });

export const POST = withApiHandler(async (request) => {
  const user = await requireReviewer();
  const body = reviewSchema.parse(await request.json());

  const assessment = await db.assessment.findUnique({
    where: { id: body.assessmentId },
    include: { session: true },
  });

  if (!assessment || assessment.session.tenantId !== user.tenantId) {
    throw new NotFoundError('Assessment not found');
  }


  const metadata = (assessment.metadata as Record<string, unknown> | null) ?? {};
  const updated = await db.assessment.update({
    where: { id: body.assessmentId },
    data: {
      metadata: {
        ...metadata,
        educatorReview: {
          reviewerId: user.id,
          rubricScore: body.rubricScore,
          comments: body.comments,
          reviewedAt: new Date().toISOString(),
        },
      },
    },
  });

  return NextResponse.json({ data: updated, message: 'Assessment reviewed successfully' });
}, { rateLimit: { windowMs: 60_000, max: 30 } });
