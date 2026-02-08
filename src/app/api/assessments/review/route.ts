import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const reviewSchema = z.object({
  assessmentId: z.string().min(1),
  rubricScore: z.number().min(0).max(100),
  comments: z.string().min(1).max(2000),
});

export async function GET() {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
}

export async function POST(request: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (!['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = reviewSchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof z.ZodError ? error.errors.map((e) => e.message).join(', ') : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const assessment = await db.assessment.findUnique({
    where: { id: body.assessmentId },
    include: { session: true },
  });

  if (!assessment || assessment.session.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
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
}
