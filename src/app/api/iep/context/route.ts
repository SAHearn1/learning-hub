import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { buildOptimizedContext } from '@/lib/rag/context-window-manager';

// =================================================================
// IEP Context Retrieval API
// GET /api/iep/context
// Students can only retrieve their own IEP context.
// Educators can retrieve context for students in their classes.
// =================================================================

const contextQuerySchema = z.object({
  studentId: z.string().min(1, 'studentId is required'),
  query: z.string().min(1, 'query is required').max(2000),
  sessionPhase: z.string().optional().default('ROOT'),
  subject: z.string().optional().default('MATH'),
  maxTokens: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .pipe(z.number().int().min(1000).max(32000).optional()),
});

export async function GET(req: NextRequest) {
  const { userId: clerkId } = auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Look up authenticated user
  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: {
      student: true,
      educator: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Parse and validate query parameters
  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());

  let params: z.infer<typeof contextQuerySchema>;
  try {
    params = contextQuerySchema.parse(searchParams);
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
        : 'Invalid query parameters';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Authorization: verify the user can access this student's data
  const canAccess = await verifyStudentAccess(user, params.studentId);
  if (!canAccess) {
    return NextResponse.json(
      { error: 'Forbidden: you do not have access to this student\'s IEP data' },
      { status: 403 },
    );
  }

  // Fetch student details for context building
  const student = await db.student.findUnique({
    where: { id: params.studentId },
    include: {
      iepAccommodations: { where: { active: true } },
    },
  });

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  try {
    const optimizedContext = await buildOptimizedContext({
      studentId: params.studentId,
      query: params.query,
      sessionPhase: params.sessionPhase,
      subject: params.subject,
      gradeLevel: student.gradeLevel,
      accommodations: student.iepAccommodations.map((a) => a.type),
      sessionHistory: '', // No session history for standalone context retrieval
      maxTokens: params.maxTokens,
    });

    return NextResponse.json({
      success: true,
      context: optimizedContext,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error during context retrieval';

    console.error('IEP context retrieval failed:', errorMessage);

    return NextResponse.json(
      { error: 'Context retrieval failed', message: errorMessage },
      { status: 500 },
    );
  }
}

/**
 * Verifies that the authenticated user has access to a student's IEP data.
 *
 * Access rules:
 * - Students can only access their own data
 * - Educators can access data for students enrolled in their classes
 * - School admins, district admins, and platform admins can access
 *   any student within their tenant
 */
async function verifyStudentAccess(
  user: {
    id: string;
    role: string;
    tenantId: string;
    student?: { id: string } | null;
    educator?: { id: string } | null;
  },
  studentId: string,
): Promise<boolean> {
  // Students can only see their own IEP data
  if (user.role === 'STUDENT') {
    return user.student?.id === studentId;
  }

  // Admins can access any student in their tenant
  if (['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'].includes(user.role)) {
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { user: { select: { tenantId: true } } },
    });
    return student?.user.tenantId === user.tenantId;
  }

  // Educators can access students in their classes
  if (user.role === 'EDUCATOR') {
    const enrollment = await db.classEnrollment.findFirst({
      where: {
        studentId,
        class: {
          educatorId: user.id,
        },
        status: 'ACTIVE',
      },
    });
    return enrollment !== null;
  }

  // Parents: check if the student is one of their children
  if (user.role === 'PARENT') {
    const parent = await db.parent.findUnique({
      where: { userId: user.id },
    });
    if (!parent) return false;

    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { userId: true },
    });
    return student ? parent.childrenIds.includes(student.userId) : false;
  }

  return false;
}
