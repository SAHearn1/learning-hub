import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ForbiddenError, NotFoundError } from '@/lib/api-errors';

const phaseConfigSchema = z.object({
  phase: z.enum(['ROOT', 'REGULATE', 'REFLECT', 'RESTORE', 'RECONNECT']),
  durationMinutes: z.number().int().min(1).max(60).default(10),
  prompt: z.string().max(2000).optional(),
  activities: z.array(z.string().max(200)).max(10).optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  subject: z.enum(['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY']),
  gradeLevel: z.array(z.number().int().min(0).max(12)).min(1),
  phases: z.array(phaseConfigSchema).min(1).max(5),
  totalDurationMinutes: z.number().int().min(5).max(120).optional(),
});

export const GET = withApiHandler(async (req) => {
  const user = await requireUser();

  if (!['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Only educators and administrators can view templates');
  }

  const subject = req.nextUrl.searchParams.get('subject');
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10);
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10), 100);

  const where: Record<string, unknown> = { tenantId: user.tenantId };
  if (subject) where.subject = subject;

  const [templates, total] = await Promise.all([
    db.fiveRTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { assignments: true } },
      },
    }),
    db.fiveRTemplate.count({ where }),
  ]);

  return NextResponse.json({ data: templates, total, page, limit });
});

export const POST = withApiHandler(async (req) => {
  const user = await requireUser();

  if (!['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    throw new ForbiddenError('Only educators can create 5R templates');
  }

  const body = createTemplateSchema.parse(await req.json());
  const totalDuration = body.totalDurationMinutes ?? body.phases.reduce((sum, p) => sum + p.durationMinutes, 0);

  const template = await db.fiveRTemplate.create({
    data: {
      tenantId: user.tenantId,
      createdById: user.id,
      name: body.name,
      description: body.description,
      subject: body.subject,
      gradeLevel: body.gradeLevel,
      phases: body.phases as unknown as Prisma.InputJsonValue,
      totalDurationMinutes: totalDuration,
    },
  });

  return NextResponse.json({ data: template }, { status: 201 });
});
