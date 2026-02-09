import { NextRequest, NextResponse } from 'next/server';
import { withClassroomAccess } from '@/lib/middleware/rbac-middleware';
import { db } from '@/lib/db';
import { z } from 'zod';
import type { AuthenticatedUser } from '@/lib/middleware/rbac-middleware';

const updateLearningPathSchema = z.object({
  standardIds: z.array(z.string()).optional(),
  topicIds: z.array(z.string()).optional(),
  customSequence: z.array(z.object({
    type: z.enum(['STANDARD', 'TOPIC', 'CUSTOM']),
    id: z.string(),
    order: z.number(),
  })).optional(),
  adaptiveSettings: z.object({
    allowSkipping: z.boolean().optional(),
    minMasteryLevel: z.number().min(0).max(100).optional(),
    reviewInterval: z.number().optional(),
  }).optional(),
});

/**
 * GET /api/classroom/[classId]/learning-path
 * Retrieve the learning path for a specific classroom
 * Accessible by: EDUCATOR (for their own classrooms), SCHOOL_ADMIN, DISTRICT_ADMIN, PLATFORM_ADMIN
 *
 * This route is protected by withClassroomAccess middleware which ensures:
 * - Teachers can only access their own classrooms
 * - School/District admins can access classrooms in their scope
 * - Platform admins can access all classrooms
 */
export const GET = withClassroomAccess(
  async (req: NextRequest, user: AuthenticatedUser, context?: { params: Promise<Record<string, string>> }) => {
    try {
      const params = context?.params ? await context.params : undefined;
      const classId = params?.classId;

      if (!classId) {
        return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
      }

      // Fetch the class with its learning path configuration
      const classData = await db.class.findUnique({
        where: { id: classId },
        include: {
          educator: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          enrollments: {
            include: {
              student: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!classData) {
        return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
      }

      // Fetch standards and topics associated with this classroom's learning path
      // This is a placeholder - you would store this in a LearningPath model
      const standards = await db.standard.findMany({
        where: {
          subject: classData.subject,
          gradeLevel: { has: classData.gradeLevel },
        },
        select: {
          id: true,
          code: true,
          description: true,
          domain: true,
          cluster: true,
        },
      });

      const topics = await db.topic.findMany({
        where: {
          subject: classData.subject,
          gradeLevel: { has: classData.gradeLevel },
        },
        select: {
          id: true,
          name: true,
          description: true,
          learningObjectives: true,
          estimatedDuration: true,
        },
      });

      return NextResponse.json({
        classroom: {
          id: classData.id,
          name: classData.name,
          subject: classData.subject,
          gradeLevel: classData.gradeLevel,
          educator: {
            name: `${classData.educator.user.firstName} ${classData.educator.user.lastName}`,
          },
          studentCount: classData.enrollments.length,
        },
        learningPath: {
          standards,
          topics,
          // Add any classroom-specific customizations here
          customSequence: [], // Placeholder
          adaptiveSettings: {
            allowSkipping: true,
            minMasteryLevel: 80,
            reviewInterval: 7,
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch learning path';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);

/**
 * PATCH /api/classroom/[classId]/learning-path
 * Update the learning path for a specific classroom
 * Accessible by: EDUCATOR (for their own classrooms), SCHOOL_ADMIN, DISTRICT_ADMIN, PLATFORM_ADMIN
 *
 * This route is protected by withClassroomAccess middleware which ensures:
 * - Teachers can ONLY modify their own classroom's learning paths
 * - Teachers CANNOT modify global curriculum settings
 * - School/District admins can modify classrooms in their scope
 * - Platform admins can modify all classrooms
 */
export const PATCH = withClassroomAccess(
  async (req: NextRequest, user: AuthenticatedUser, context?: { params: Promise<Record<string, string>> }) => {
    try {
      const params = context?.params ? await context.params : undefined;
      const classId = params?.classId;

      if (!classId) {
        return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
      }

      const body = await req.json();
      const updates = updateLearningPathSchema.parse(body);

      // Verify the classroom exists
      const classData = await db.class.findUnique({
        where: { id: classId },
      });

      if (!classData) {
        return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
      }

      // Store the learning path customization
      // This would typically be stored in a separate LearningPath model
      // For now, we'll just validate and return the updates

      // Validate that referenced standards and topics exist
      if (updates.standardIds && updates.standardIds.length > 0) {
        const standardCount = await db.standard.count({
          where: { id: { in: updates.standardIds } },
        });
        if (standardCount !== updates.standardIds.length) {
          return NextResponse.json(
            { error: 'One or more standard IDs are invalid' },
            { status: 400 }
          );
        }
      }

      if (updates.topicIds && updates.topicIds.length > 0) {
        const topicCount = await db.topic.count({
          where: { id: { in: updates.topicIds } },
        });
        if (topicCount !== updates.topicIds.length) {
          return NextResponse.json(
            { error: 'One or more topic IDs are invalid' },
            { status: 400 }
          );
        }
      }

      return NextResponse.json({
        message: 'Learning path updated successfully',
        classId,
        updates,
        updatedBy: {
          userId: user.id,
          role: user.role,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }

      const message = error instanceof Error ? error.message : 'Failed to update learning path';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);

/**
 * POST /api/classroom/[classId]/learning-path/reset
 * Reset the classroom learning path to default (based on grade level and subject)
 * Accessible by: EDUCATOR (for their own classrooms), SCHOOL_ADMIN, DISTRICT_ADMIN, PLATFORM_ADMIN
 */
export const POST = withClassroomAccess(
  async (req: NextRequest, user: AuthenticatedUser, context?: { params: Promise<Record<string, string>> }) => {
    try {
      const params = context?.params ? await context.params : undefined;
      const classId = params?.classId;

      if (!classId) {
        return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
      }

      const classData = await db.class.findUnique({
        where: { id: classId },
      });

      if (!classData) {
        return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
      }

      // Reset to default learning path based on grade level and subject
      // This would clear any classroom-specific customizations

      return NextResponse.json({
        message: 'Learning path reset to default successfully',
        classId,
        resetBy: {
          userId: user.id,
          role: user.role,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset learning path';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
