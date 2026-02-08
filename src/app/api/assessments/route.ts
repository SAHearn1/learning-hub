import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';

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

export async function POST(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = submitAssessmentSchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.errors.map(e => e.message).join(', ') : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const session = await db.session.findUnique({
    where: { id: body.sessionId },
    include: { student: true },
  });
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (user.role === 'STUDENT' && session.student.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (user.role !== 'STUDENT' && session.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
}

export async function GET(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { student: true },
  });
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (user.role === 'STUDENT' && session.student.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (user.role !== 'STUDENT' && session.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const assessments = await db.assessment.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: assessments });
}
