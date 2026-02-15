import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { ValidationError, ForbiddenError, ConflictError } from '@/lib/api-errors';
import { db } from '@/lib/db';
import { z } from 'zod';

const createStandardSchema = z.object({
  code: z.string().min(1),
  framework: z.enum(['COMMON_CORE', 'GEORGIA', 'NGSS']),
  subject: z.enum(['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY']),
  gradeLevel: z.array(z.coerce.number().int()),
  domain: z.string(),
  cluster: z.string(),
  description: z.string(),
  fullText: z.string(),
});

/**
 * GET /api/curriculum/standards
 * Retrieve global curriculum standards
 * Accessible by: All authenticated users with VIEW_CURRICULUM permission
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const framework = url.searchParams.get('framework');
  const subject = url.searchParams.get('subject');
  const gradeLevel = url.searchParams.get('gradeLevel');

  const standards = await db.standard.findMany({
    where: {
      ...(framework && { framework: framework as any }),
      ...(subject && { subject: subject as any }),
      ...(gradeLevel && { gradeLevel: { has: parseInt(gradeLevel, 10) } }),
    },
    select: {
      id: true,
      code: true,
      framework: true,
      subject: true,
      gradeLevel: true,
      domain: true,
      cluster: true,
      description: true,
      fullText: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      code: 'asc',
    },
  });

  return NextResponse.json({ standards });
});

/**
 * POST /api/curriculum/standards
 * Create a new global curriculum standard
 * Accessible by: PLATFORM_ADMIN only
 */
export const POST = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (user.role !== 'PLATFORM_ADMIN') {
    throw new ForbiddenError('Only platform administrators can modify global curriculum');
  }

  const body = await req.json();
  const data = createStandardSchema.parse(body);

  // Check if standard already exists
  const existing = await db.standard.findUnique({
    where: { code: data.code },
  });

  if (existing) {
    throw new ConflictError('A standard with this code already exists');
  }

  const standard = await db.standard.create({
    data,
  });

  return NextResponse.json(
    {
      message: 'Standard created successfully',
      standard,
    },
    { status: 201 }
  );
});

/**
 * PATCH /api/curriculum/standards
 * Update an existing global curriculum standard
 * Accessible by: PLATFORM_ADMIN only
 */
export const PATCH = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (user.role !== 'PLATFORM_ADMIN') {
    throw new ForbiddenError('Only platform administrators can modify global curriculum');
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    throw new ValidationError('Standard ID is required');
  }

  const standard = await db.standard.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json({
    message: 'Standard updated successfully',
    standard,
  });
});

/**
 * DELETE /api/curriculum/standards
 * Delete a global curriculum standard
 * Accessible by: PLATFORM_ADMIN only
 */
export const DELETE = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (user.role !== 'PLATFORM_ADMIN') {
    throw new ForbiddenError('Only platform administrators can modify global curriculum');
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) {
    throw new ValidationError('Standard ID is required');
  }

  await db.standard.delete({
    where: { id },
  });

  return NextResponse.json({
    message: 'Standard deleted successfully',
  });
});
