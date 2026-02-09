import { NextRequest, NextResponse } from 'next/server';
import { withGlobalCurriculumAccess } from '@/lib/middleware/rbac-middleware';
import { db } from '@/lib/db';
import { z } from 'zod';
import type { AuthenticatedUser } from '@/lib/middleware/rbac-middleware';

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
export async function GET(req: NextRequest) {
  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch topics';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/curriculum/topics
 * Create a new global curriculum topic
 * Accessible by: PLATFORM_ADMIN only
 *
 * This route is protected by withGlobalCurriculumAccess middleware which ensures:
 * - Only users with PLATFORM_ADMIN role can access
 * - Teachers (EDUCATOR role) CANNOT modify global curriculum topics
 */
export const POST = withGlobalCurriculumAccess(
  async (req: NextRequest, user: AuthenticatedUser) => {
    try {
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
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }

      const message = error instanceof Error ? error.message : 'Failed to create topic';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);

/**
 * PATCH /api/curriculum/topics
 * Update an existing global curriculum topic
 * Accessible by: PLATFORM_ADMIN only
 */
export const PATCH = withGlobalCurriculumAccess(
  async (req: NextRequest, user: AuthenticatedUser) => {
    try {
      const body = await req.json();
      const { id, ...updates } = body;

      if (!id) {
        return NextResponse.json({ error: 'Topic ID is required' }, { status: 400 });
      }

      const topic = await db.topic.update({
        where: { id },
        data: updates,
      });

      return NextResponse.json({
        message: 'Topic updated successfully',
        topic,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update topic';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);

/**
 * DELETE /api/curriculum/topics
 * Delete a global curriculum topic
 * Accessible by: PLATFORM_ADMIN only
 */
export const DELETE = withGlobalCurriculumAccess(
  async (req: NextRequest, user: AuthenticatedUser) => {
    try {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');

      if (!id) {
        return NextResponse.json({ error: 'Topic ID is required' }, { status: 400 });
      }

      await db.topic.delete({
        where: { id },
      });

      return NextResponse.json({
        message: 'Topic deleted successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete topic';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
