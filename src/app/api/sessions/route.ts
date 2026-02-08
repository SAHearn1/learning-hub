import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { enforceUsageLimits, UsageLimitError } from '@/lib/usage-limits';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { AuthenticationError, NotFoundError, PaymentRequiredError } from '@/lib/api-errors';
import { assertMinorConsentForLearning } from '@/lib/compliance';

const createSessionSchema = z.object({
  subject: z.enum(['MATH', 'SCIENCE', 'LANGUAGE_ARTS']),
  engagementMode: z.enum(['FORWARD', 'REVERSE', 'ERROR_ANALYSIS', 'MULTIPLE_PATHWAYS', 'PROBLEM_POSING']).default('FORWARD'),
});

export const POST = withApiHandler(async (req, _ctx) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { student: true },
  });
  if (!user?.student) {
    throw new NotFoundError('Student profile not found');
  }

  assertMinorConsentForLearning(user.isMinor, user.consentStatus, {
    action: 'starting a learning session',
  });

  const body = createSessionSchema.parse(await req.json());

  try {
    await enforceUsageLimits(user.tenantId);
  } catch (error) {
    if (error instanceof UsageLimitError) {
      throw new PaymentRequiredError(error.message);
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
      metadata: {},
    },
  });

  return NextResponse.json({ data: session }, { status: 201 });
}, { rateLimit: { windowMs: 60_000, max: 30 } });

export const GET = withApiHandler(async (req, _ctx) => {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    throw new AuthenticationError();
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { student: true },
  });
  if (!user) {
    throw new NotFoundError('User not found');
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
}, { rateLimit: { windowMs: 60_000, max: 60 } });
