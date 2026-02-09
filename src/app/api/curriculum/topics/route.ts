import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { ValidationError, ForbiddenError, ConflictError } from '@/lib/api-errors';
import { db } from '@/lib/db';
import { z } from 'zod';

const createTopicSchema = z.object({
  name: z.string().min(1),
  subject: z.enum(['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY']),
  gradeLevel: z.array(z.string()),
  description: z.string(),
  learningObjectives: z.array(z.string()).optional().default([]),
  estimatedDuration: z.number().optional(),
});

/**
 * GET /api/curriculum/topics
 * Retrieve global curriculum topics
 * Accessible by: All authenticated users with VIEW_CURRICULUM permission
 */
export const GET = withApiHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const subject = url.searchParams.get('subject');
  const gradeLevel = url.searchParams.get('gradeLevel');

  const topics = await db.topic.findMany({
    where: {
      ...(subject && { subject: subject as any }),
      ...(gradeLevel && { gradeLevel: { has: gradeLevel } }),
    },
    select: {
      id: true,
      name: true,
      subject: true,
      gradeLevel: true,
      description: true,
      learningObjectives: true,
      estimatedDuration: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return NextResponse.json({ topics });
});

/**
 * POST /api/curriculum/topics
 * Create a new global curriculum topic
 * Accessible by: PLATFORM_ADMIN only
 */
export const POST = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (user.role !== 'PLATFORM_ADMIN') {
    throw new ForbiddenError('Only platform administrators can modify global curriculum');
  }

  const body = await req.json();
  const data = createTopicSchema.parse(body);

  const topic = await db.topic.create({
    data,
  });

  return NextResponse.json(
    {
      message: 'Topic created successfully',
      topic,
    },
    { status: 201 }
  );
});

/**
 * PATCH /api/curriculum/topics
 * Update an existing global curriculum topic
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
    throw new ValidationError('Topic ID is required');
  }

  const topic = await db.topic.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json({
    message: 'Topic updated successfully',
    topic,
  });
});

/**
 * DELETE /api/curriculum/topics
 * Delete a global curriculum topic
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
    throw new ValidationError('Topic ID is required');
  }

  await db.topic.delete({
    where: { id },
  });

  return NextResponse.json({
    message: 'Topic deleted successfully',
  });
});
