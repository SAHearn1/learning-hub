import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      assessments: true,
      student: { include: { user: true } },
    },
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

  return NextResponse.json({ data: session });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = updateSessionSchema.parse(await req.json());
  } catch (err: unknown) {
    const message = err instanceof z.ZodError
      ? err.errors.map((e: { message: string }) => e.message).join(', ')
      : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
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
}

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
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  // Soft delete: set endedAt timestamp
  const updated = await db.session.update({
    where: { id: sessionId },
    data: { endedAt: new Date() },
  });

  return NextResponse.json({ 
    data: updated,
    message: 'Session ended successfully',
  });
}
