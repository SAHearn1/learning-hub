import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { enforceUsageLimits, UsageLimitError } from '@/lib/usage-limits';
import { z } from 'zod';

const createSessionSchema = z.object({
  subject: z.enum(['MATH', 'SCIENCE', 'LANGUAGE_ARTS']),
  engagementMode: z.enum(['FORWARD', 'REVERSE', 'ERROR_ANALYSIS', 'MULTIPLE_PATHWAYS', 'PROBLEM_POSING']).default('FORWARD'),
});

export async function POST(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { student: true },
  });
  if (!user?.student) {
    return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
  }

  let body;
  try {
    body = createSessionSchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.errors.map(e => e.message).join(', ') : 'Invalid request';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await enforceUsageLimits(user.tenantId);
  } catch (error) {
    if (error instanceof UsageLimitError) {
      return NextResponse.json({ error: error.message }, { status: 402 });
    }
    throw error;
  }

  const session = await db.session.create({
    data: {
      tenantId: user.tenantId,
      studentId: user.student.id,
      subject: body.subject,
      currentPhase: 'ROOT',
      engagementMode: body.engagementMode,
      regulationState: { level: 70, signals: [], interventionCount: 0 },
      metadata: {
        fiveRState: {
          currentPhase: 'ROOT',
          phaseHistory: [
            {
              phase: 'ROOT',
              timestamp: new Date().toISOString(),
              reason: 'Session initialized at Root phase.',
            },
          ],
          sentiment: { label: 'neutral', score: 0 },
          regulationPassed: true,
          updatedAt: new Date().toISOString(),
        },
      },
    },
  });

  return NextResponse.json({ data: session }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { student: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10);
  const pageSize = Math.min(parseInt(req.nextUrl.searchParams.get('pageSize') ?? '20', 10), 100);
  const skip = (page - 1) * pageSize;

  const where = user.student
    ? { studentId: user.student.id }
    : { tenantId: user.tenantId };

  const [sessions, total] = await Promise.all([
    db.session.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip,
      take: pageSize,
      include: { _count: { select: { messages: true } } },
    }),
    db.session.count({ where }),
  ]);

  return NextResponse.json({
    data: sessions,
    total,
    page,
    pageSize,
    hasMore: skip + pageSize < total,
  });
}
