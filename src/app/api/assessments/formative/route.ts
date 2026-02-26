import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateFormativeCheck } from '@/lib/assessments/formative-generator';
import { requireUser } from '@/lib/auth';
import { hasRequiredMinorConsent } from '@/lib/compliance';
import { withApiHandler } from '@/lib/api-handler';
import { ForbiddenError, NotFoundError, BadRequestError } from '@/lib/api-errors';

export const POST = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
    throw new ForbiddenError('Parental consent required before formative assessments');
  }

  const body = await req.json();
  const { sessionId, currentTopic, recentContent, targetBloomsLevel } = body;

  // Validate required fields
  if (!sessionId || !currentTopic) {
    throw new BadRequestError('Missing required fields: sessionId, currentTopic');
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

  if (user.role === 'STUDENT' && session.student.user.id !== user.id) {
    throw new ForbiddenError('Forbidden');
  }
  if (user.role !== 'STUDENT' && session.tenantId !== user.tenantId) {
    throw new ForbiddenError('Forbidden');
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
});

export const GET = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
    throw new ForbiddenError('Parental consent required before formative assessments');
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    throw new BadRequestError('sessionId is required');
  }

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { student: true },
  });
  if (!session) {
    throw new NotFoundError('Session not found');
  }
  if (user.role === 'STUDENT' && session.student.userId !== user.id) {
    throw new ForbiddenError('Forbidden');
  }
  if (user.role !== 'STUDENT' && session.tenantId !== user.tenantId) {
    throw new ForbiddenError('Forbidden');
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
});
