import { NextRequest, NextResponse } from 'next/server';
import { withGlobalCurriculumAccess } from '@/lib/middleware/rbac-middleware';
import { db } from '@/lib/db';
import { z } from 'zod';
import type { AuthenticatedUser } from '@/lib/middleware/rbac-middleware';

const createStandardSchema = z.object({
  code: z.string().min(1),
  framework: z.enum(['CCSS', 'GEORGIA', 'NGSS', 'CUSTOM']),
  subject: z.enum(['MATH', 'SCIENCE', 'ELA', 'SOCIAL_STUDIES', 'OTHER']),
  gradeLevel: z.array(z.string()),
  domain: z.string().optional(),
  cluster: z.string().optional(),
  description: z.string(),
  fullText: z.string(),
});

/**
 * GET /api/curriculum/standards
 * Retrieve global curriculum standards
 * Accessible by: All authenticated users with VIEW_CURRICULUM permission
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const framework = url.searchParams.get('framework');
    const subject = url.searchParams.get('subject');
    const gradeLevel = url.searchParams.get('gradeLevel');

    const standards = await db.standard.findMany({
      where: {
        ...(framework && { framework: framework as any }),
        ...(subject && { subject: subject as any }),
        ...(gradeLevel && { gradeLevel: { has: gradeLevel } }),
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch standards';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/curriculum/standards
 * Create a new global curriculum standard
 * Accessible by: PLATFORM_ADMIN only
 *
 * This route is protected by withGlobalCurriculumAccess middleware which ensures:
 * - Only users with PLATFORM_ADMIN role can access
 * - Teachers (EDUCATOR role) CANNOT modify global curriculum
 */
export const POST = withGlobalCurriculumAccess(
  async (req: NextRequest, user: AuthenticatedUser) => {
    try {
      const body = await req.json();
      const data = createStandardSchema.parse(body);

      // Check if standard already exists
      const existing = await db.standard.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'A standard with this code already exists' },
          { status: 409 }
        );
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
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.errors },
          { status: 400 }
        );
      }

      const message = error instanceof Error ? error.message : 'Failed to create standard';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);

/**
 * PATCH /api/curriculum/standards
 * Update an existing global curriculum standard
 * Accessible by: PLATFORM_ADMIN only
 */
export const PATCH = withGlobalCurriculumAccess(
  async (req: NextRequest, user: AuthenticatedUser) => {
    try {
      const body = await req.json();
      const { id, ...updates } = body;

      if (!id) {
        return NextResponse.json({ error: 'Standard ID is required' }, { status: 400 });
      }

      const standard = await db.standard.update({
        where: { id },
        data: updates,
      });

      return NextResponse.json({
        message: 'Standard updated successfully',
        standard,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update standard';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);

/**
 * DELETE /api/curriculum/standards
 * Delete a global curriculum standard
 * Accessible by: PLATFORM_ADMIN only
 */
export const DELETE = withGlobalCurriculumAccess(
  async (req: NextRequest, user: AuthenticatedUser) => {
    try {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');

      if (!id) {
        return NextResponse.json({ error: 'Standard ID is required' }, { status: 400 });
      }

      await db.standard.delete({
        where: { id },
      });

      return NextResponse.json({
        message: 'Standard deleted successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete standard';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
);
