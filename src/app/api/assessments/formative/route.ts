import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { generateFormativeCheck } from '@/lib/assessments/formative-generator';
import { withApiHandler } from '@/lib/api-handler';
import {
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/lib/api-errors';

export const POST = withApiHandler(async (req) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const body = await req.json();
  const { sessionId, currentTopic, recentContent, targetBloomsLevel } = body;

  // Validate required fields
  if (!sessionId || !currentTopic) {
    throw new ValidationError('Missing required fields: sessionId, currentTopic');
  }

  // Get session info
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      student: { include: { user: { select: { id: true, tenantId: true } } } },
    },
  });

  if (!session) {
    throw new NotFoundError('Session not found');
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user) {
    throw new ForbiddenError();
  }
  if (user.role === 'STUDENT' && session.student.user.id !== user.id) {
    throw new ForbiddenError();
  }
  if (user.role !== 'STUDENT' && session.tenantId !== user.tenantId) {
    throw new ForbiddenError();
  }

  // Generate formative check question using AI
  const question = await generateFormativeCheck({
    subject: session.subject,
    gradeLevel: session.student.gradeLevel,
    currentTopic,
    recentContent: recentContent || 'Current tutoring session content',
    targetBloomsLevel: targetBloomsLevel || 'UNDERSTAND',
  });

  // Store assessment in database
  const assessment = await db.assessment.create({
    data: {
      sessionId,
      type: 'FORMATIVE',
      bloomsLevel: question.bloomsLevel,
      difficulty: question.difficulty,
      question: question.question,
      metadata: {
        type: question.type,
        options: question.options,
        correctAnswer: question.correctAnswer,
        rubric: question.rubric,
        scaffoldHints: question.scaffoldHints,
        topic: currentTopic,
      },
    },
  });

  return NextResponse.json({
    success: true,
    assessment,
    message: 'Formative check created successfully',
  });
}, { rateLimit: { windowMs: 60_000, max: 30 } });

export const GET = withApiHandler(async (req) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    throw new ValidationError('sessionId is required');
  }

  const user = await db.user.findUnique({ where: { clerkUserId: clerkId } });
  if (!user) {
    throw new ForbiddenError();
  }

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { student: true },
  });
  if (!session) {
    throw new NotFoundError('Session not found');
  }
  if (user.role === 'STUDENT' && session.student.userId !== user.id) {
    throw new ForbiddenError();
  }
  if (user.role !== 'STUDENT' && session.tenantId !== user.tenantId) {
    throw new ForbiddenError();
  }

  const assessments = await db.assessment.findMany({
    where: {
      sessionId,
      type: 'FORMATIVE',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json({
    success: true,
    assessments,
  });
}, { rateLimit: { windowMs: 60_000, max: 60 } });
