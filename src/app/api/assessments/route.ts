import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/lib/api-errors';

const submitAssessmentSchema = z.object({
  sessionId: z.string().min(1),
  standardId: z.string().optional(),
  type: z.enum(['DIAGNOSTIC', 'FORMATIVE', 'SUMMATIVE', 'PRACTICE']),
  bloomsLevel: z.enum(['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE']),
  difficulty: z.number().int().min(1).max(10),
  question: z.string().min(1),
  studentResponse: z.string().optional(),
  isCorrect: z.boolean().optional(),
  score: z.number().min(0).max(100).optional(),
  feedback: z.string().optional(),
});

export const POST = withApiHandler(async (req) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const body = submitAssessmentSchema.parse(await req.json());

  const session = await db.session.findUnique({
    where: { id: body.sessionId },
    include: { student: true },
  });
  if (!session) {
    throw new NotFoundError('Session not found');
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user) {
    throw new ForbiddenError();
  }
  if (user.role === 'STUDENT' && session.student.userId !== user.id) {
    throw new ForbiddenError();
  }
  if (user.role !== 'STUDENT' && session.tenantId !== user.tenantId) {
    throw new ForbiddenError();
  }

  const assessment = await db.assessment.create({
    data: {
      sessionId: body.sessionId,
      standardId: body.standardId ?? null,
      type: body.type,
      bloomsLevel: body.bloomsLevel,
      difficulty: body.difficulty,
      question: body.question,
      studentResponse: body.studentResponse ?? null,
      isCorrect: body.isCorrect ?? null,
      score: body.score ?? null,
      feedback: body.feedback ?? null,
    },
  });

  // Update mastery progress if we have a standard and a score
  if (body.standardId && body.score !== undefined) {
    const existing = await db.progress.findUnique({
      where: { studentId_standardId: { studentId: session.studentId, standardId: body.standardId } },
    });

    const newCount = (existing?.assessmentCount ?? 0) + 1;
    const previousMastery = existing?.masteryLevel ?? 0;
    // Weighted moving average: recent scores matter more
    const weight = 0.3;
    const newMastery = previousMastery === 0
      ? body.score
      : previousMastery * (1 - weight) + body.score * weight;

    await db.progress.upsert({
      where: { studentId_standardId: { studentId: session.studentId, standardId: body.standardId } },
      update: {
        masteryLevel: newMastery,
        assessmentCount: newCount,
        lastAssessedAt: new Date(),
      },
      create: {
        tenantId: session.tenantId,
        studentId: session.studentId,
        standardId: body.standardId,
        masteryLevel: newMastery,
        assessmentCount: 1,
        lastAssessedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ data: assessment }, { status: 201 });
}, { rateLimit: { windowMs: 60_000, max: 30 } });

export const GET = withApiHandler(async (req) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    throw new ValidationError('sessionId required');
  }

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { student: true },
  });
  if (!session) {
    throw new NotFoundError('Session not found');
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user) {
    throw new ForbiddenError();
  }
  if (user.role === 'STUDENT' && session.student.userId !== user.id) {
    throw new ForbiddenError();
  }
  if (user.role !== 'STUDENT' && session.tenantId !== user.tenantId) {
    throw new ForbiddenError();
  }

  const assessments = await db.assessment.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: assessments });
}, { rateLimit: { windowMs: 60_000, max: 60 } });
