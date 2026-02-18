import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  trackReasoningMove,
  getStudentReasoningProfile,
  suggestNextReasoningMoves,
  REASONING_MOVE_DESCRIPTIONS,
} from '@/lib/assessments/reasoning-move-tracker';
import { ReasoningMove } from '@prisma/client';
import { requireUser } from '@/lib/auth';
import { hasRequiredMinorConsent } from '@/lib/compliance';
import { withApiHandler } from '@/lib/api-handler';
import { ForbiddenError } from '@/lib/api-errors';

async function canAccessStudent(user: Awaited<ReturnType<typeof requireUser>>, studentId: string): Promise<boolean> {
  const student = await db.student.findUnique({
    where: { id: studentId },
    include: { user: { select: { id: true, tenantId: true } } },
  });

  if (!student) {
    return false;
  }

  if (user.role === 'STUDENT') {
    return student.user.id === user.id;
  }

  return student.user.tenantId === user.tenantId;
}

export const POST = withApiHandler(async (request) => {
  const user = await requireUser();

  if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
    throw new ForbiddenError('Parental consent required before tracking reasoning moves');
  }

  const body = await request.json();
  const { studentId, move, wasPrompted } = body;

  if (!studentId || !move) {
    return NextResponse.json(
      { error: 'Missing required fields: studentId, move' },
      { status: 400 }
    );
  }

  if (!Object.values(ReasoningMove).includes(move)) {
    return NextResponse.json(
      { error: `Invalid reasoning move. Must be one of: ${Object.values(ReasoningMove).join(', ')}` },
      { status: 400 }
    );
  }

  if (!(await canAccessStudent(user, studentId))) {
    throw new ForbiddenError();
  }

  await trackReasoningMove({
    studentId,
    move,
    wasPrompted: wasPrompted || false,
  });

  return NextResponse.json({
    success: true,
    message: 'Reasoning move tracked successfully',
  });
});

export const GET = withApiHandler(async (request) => {
  const user = await requireUser();

  if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
    throw new ForbiddenError('Parental consent required before reasoning profile access');
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const includeSuggestions = searchParams.get('includeSuggestions') === 'true';

  if (!studentId) {
    return NextResponse.json(
      { error: 'studentId is required' },
      { status: 400 }
    );
  }

  if (!(await canAccessStudent(user, studentId))) {
    throw new ForbiddenError();
  }

  const profile = await getStudentReasoningProfile(studentId);

  let suggestions = null;
  if (includeSuggestions) {
    const nextMoves = suggestNextReasoningMoves(profile);
    suggestions = nextMoves.map((move) => ({
      move,
      description: REASONING_MOVE_DESCRIPTIONS[move],
    }));
  }

  return NextResponse.json({
    success: true,
    profile,
    suggestions,
    descriptions: REASONING_MOVE_DESCRIPTIONS,
  });
});

export const PUT = withApiHandler(async (request) => {
  const user = await requireUser();

  if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
    throw new ForbiddenError('Parental consent required before tracking reasoning moves');
  }

  const body = await request.json();
  const { studentId, moves } = body;

  if (!studentId || !moves || !Array.isArray(moves)) {
    return NextResponse.json(
      { error: 'Missing required fields: studentId, moves (array)' },
      { status: 400 }
    );
  }

  if (!(await canAccessStudent(user, studentId))) {
    throw new ForbiddenError();
  }

  for (const moveData of moves) {
    const { move, wasPrompted } = moveData;

    if (!Object.values(ReasoningMove).includes(move)) {
      continue;
    }

    await trackReasoningMove({
      studentId,
      move,
      wasPrompted: wasPrompted || false,
    });
  }

  return NextResponse.json({
    success: true,
    message: 'Reasoning moves tracked successfully',
  });
});
