import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enforceUsageLimits, UsageLimitError } from '@/lib/usage-limits';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { NotFoundError, PaymentRequiredError, ForbiddenError } from '@/lib/api-errors';
import { hasRequiredMinorConsent } from '@/lib/compliance';

const createSessionSchema = z.object({
  subject: z.enum(['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY']),
  engagementMode: z.enum(['FORWARD', 'REVERSE', 'ERROR_ANALYSIS', 'MULTIPLE_PATHWAYS', 'PROBLEM_POSING']).default('FORWARD'),
  topicId: z.string().optional(),
});

export const POST = withApiHandler(async (req) => {
  const user = await requireUser();

  if (!hasRequiredMinorConsent(user.isMinor, user.consentStatus)) {
    throw new ForbiddenError('Parental consent required before starting sessions');
  }

  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: { id: true },
  });
  if (!tenant) {
    throw new NotFoundError('Tenant not found for current user');
  }

  let studentId = user.student?.id ?? null;
  if (!studentId && user.role === 'STUDENT') {
    const student = await db.student.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        gradeLevel: 6,
        learningPreferences: {},
        regulationProfile: {
          dysregulationTriggers: [],
          calmingStrategies: [],
          preferredBreakDuration: 5,
        },
      },
      select: { id: true },
    });
    studentId = student.id;
  }

  if (!studentId) {
    throw new NotFoundError('Student profile not found');
  }

  const body = createSessionSchema.parse(await req.json());

  try {
    await enforceUsageLimits(user.tenantId);
  } catch (error) {
    if (error instanceof UsageLimitError) {
      throw new PaymentRequiredError(error.message);
    }
    throw error;
  }

  // If a topicId was provided, validate it exists and capture its name
  let topicMeta: { topicId: string; topicName: string } | undefined;
  if (body.topicId) {
    const topic = await db.topic.findUnique({
      where: { id: body.topicId },
      select: { id: true, name: true },
    });
    if (topic) {
      topicMeta = { topicId: topic.id, topicName: topic.name };
    }
  }

  const session = await db.session.create({
    data: {
      tenantId: user.tenantId,
      studentId,
      subject: body.subject,
      currentPhase: 'ROOT',
      engagementMode: body.engagementMode,
      regulationState: { level: 70, signals: [], interventionCount: 0 },
      metadata: {
        ...(topicMeta && { topicId: topicMeta.topicId, topicName: topicMeta.topicName }),
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
});

export const GET = withApiHandler(async (req) => {
  const user = await requireUser();

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
});
