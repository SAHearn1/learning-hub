import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { NotFoundError, ForbiddenError } from '@/lib/api-errors';

const updateSessionSchema = z.object({
  currentPhase: z.enum(['ROOT', 'REGULATE', 'REFLECT', 'RESTORE', 'RECONNECT']).optional(),
  engagementMode: z.enum(['FORWARD', 'REVERSE', 'ERROR_ANALYSIS', 'MULTIPLE_PATHWAYS', 'PROBLEM_POSING']).optional(),
  regulationState: z.object({
    level: z.number().min(0).max(100),
    signals: z.array(z.string()),
    interventionCount: z.number(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
  endSession: z.boolean().optional(),
  endedAt: z.string().optional(),
});

export const GET = withApiHandler(async (_req, ctx) => {
  const { sessionId } = ctx.params;
  const user = await requireUser();

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      assessments: true,
      student: { include: { user: true } },
    },
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

  return NextResponse.json({ data: session });
});

export const PATCH = withApiHandler(async (req, ctx) => {
  const { sessionId } = ctx.params;
  const user = await requireUser();

  const body = updateSessionSchema.parse(await req.json());

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

  const updateData: Record<string, unknown> = {};
  if (body.currentPhase) updateData.currentPhase = body.currentPhase;
  if (body.engagementMode) updateData.engagementMode = body.engagementMode;
  if (body.regulationState) updateData.regulationState = body.regulationState;
  if (body.metadata) updateData.metadata = body.metadata;
  if (body.endSession) updateData.endedAt = new Date();
  if (body.endedAt) updateData.endedAt = new Date(body.endedAt);

  const updated = await db.session.update({
    where: { id: sessionId },
    data: updateData,
  });

  return NextResponse.json({ data: updated });
});

/**
 * DELETE /api/sessions/[sessionId]
 * Ends a tutoring session (soft delete via endedAt timestamp)
 *
 * @param sessionId - Session ID
 * @returns Confirmation with updated session
 * @throws 401 if not authenticated
 * @throws 403 if not authorized to end session
 * @throws 404 if session not found
 */
export const DELETE = withApiHandler(async (_req, ctx) => {
  const { sessionId } = ctx.params;
  const user = await requireUser();

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

  // Soft delete: set endedAt timestamp
  const updated = await db.session.update({
    where: { id: sessionId },
    data: { endedAt: new Date() },
  });

  return NextResponse.json({
    data: updated,
    message: 'Session ended successfully',
  });
});
