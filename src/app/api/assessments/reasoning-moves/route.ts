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

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
      return NextResponse.json({ error: 'Parental consent required before tracking reasoning moves' }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, move, wasPrompted } = body;

    // Validate required fields
    if (!studentId || !move) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, move' },
        { status: 400 }
      );
    }

    // Validate reasoning move
    if (!Object.values(ReasoningMove).includes(move)) {
      return NextResponse.json(
        { error: `Invalid reasoning move. Must be one of: ${Object.values(ReasoningMove).join(', ')}` },
        { status: 400 }
      );
    }

    if (!(await canAccessStudent(user, studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Track the reasoning move
    await trackReasoningMove({
      studentId,
      move,
      wasPrompted: wasPrompted || false,
    });

    return NextResponse.json({
      success: true,
      message: 'Reasoning move tracked successfully',
    });
  } catch (error) {
    console.error('Error tracking reasoning move:', error);
    return NextResponse.json(
      {
        error: 'Failed to track reasoning move',
        details: undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();

    if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
      return NextResponse.json({ error: 'Parental consent required before reasoning profile access' }, { status: 403 });
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get student reasoning profile
    const profile = await getStudentReasoningProfile(studentId);

    // Get suggestions if requested
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
  } catch (error) {
    console.error('Error fetching reasoning moves:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch reasoning moves',
        details: undefined,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireUser();

    if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
      return NextResponse.json({ error: 'Parental consent required before tracking reasoning moves' }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, moves } = body;

    // Validate required fields
    if (!studentId || !moves || !Array.isArray(moves)) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, moves (array)' },
        { status: 400 }
      );
    }

    if (!(await canAccessStudent(user, studentId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Track multiple reasoning moves (batch update)
    for (const moveData of moves) {
      const { move, wasPrompted } = moveData;

      if (!Object.values(ReasoningMove).includes(move)) {
        continue; // Skip invalid moves
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
  } catch (error) {
    console.error('Error tracking reasoning moves:', error);
    return NextResponse.json(
      {
        error: 'Failed to track reasoning moves',
        details: undefined,
      },
      { status: 500 }
    );
  }
}
