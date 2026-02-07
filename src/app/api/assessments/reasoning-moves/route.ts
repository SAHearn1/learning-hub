import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  trackReasoningMove,
  getStudentReasoningProfile,
  suggestNextReasoningMoves,
  REASONING_MOVE_DESCRIPTIONS,
} from '@/lib/assessments/reasoning-move-tracker';
import { ReasoningMove } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
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
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const includeSuggestions = searchParams.get('includeSuggestions') === 'true';

    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId is required' },
        { status: 400 }
      );
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
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, moves } = body;

    // Validate required fields
    if (!studentId || !moves || !Array.isArray(moves)) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, moves (array)' },
        { status: 400 }
      );
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
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
