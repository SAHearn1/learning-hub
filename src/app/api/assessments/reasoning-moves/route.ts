import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import {
  trackReasoningMove,
  getStudentReasoningProfile,
  suggestNextReasoningMoves,
  REASONING_MOVE_DESCRIPTIONS,
} from '@/lib/assessments/reasoning-move-tracker';
import { ReasoningMove } from '@prisma/client';
import { withApiHandler } from '@/lib/api-handler';
import {
  AuthenticationError,
  ValidationError,
} from '@/lib/api-errors';

export const POST = withApiHandler(async (req) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const body = await req.json();
  const { studentId, move, wasPrompted } = body;

  // Validate required fields
  if (!studentId || !move) {
    throw new ValidationError('Missing required fields: studentId, move');
  }

  // Validate reasoning move
  if (!Object.values(ReasoningMove).includes(move)) {
    throw new ValidationError(`Invalid reasoning move. Must be one of: ${Object.values(ReasoningMove).join(', ')}`);
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
}, { rateLimit: { windowMs: 60_000, max: 30 } });

export const GET = withApiHandler(async (req) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');
  const includeSuggestions = searchParams.get('includeSuggestions') === 'true';

  if (!studentId) {
    throw new ValidationError('studentId is required');
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
}, { rateLimit: { windowMs: 60_000, max: 60 } });

export const PUT = withApiHandler(async (req) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const body = await req.json();
  const { studentId, moves } = body;

  // Validate required fields
  if (!studentId || !moves || !Array.isArray(moves)) {
    throw new ValidationError('Missing required fields: studentId, moves (array)');
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
}, { rateLimit: { windowMs: 60_000, max: 30 } });
