import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { withApiHandler } from '@/lib/api-handler';
import { AuthenticationError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/api-errors';

/**
 * GET /api/progress/standards/[standardId]
 * Retrieves detailed progress for a specific standard
 *
 * @param standardId - Standard ID
 * @query studentId (optional for educators/admins)
 * @returns Detailed progress data for the standard
 * @throws 401 if not authenticated
 * @throws 403 if not authorized
 * @throws 404 if standard not found
 */
export const GET = withApiHandler(async (req, ctx) => {
  const { standardId } = ctx.params;
  const { userId: clerkId } = auth();

  if (!clerkId) {
    throw new AuthenticationError();
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { student: true, parent: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Determine which student's progress to view
  const queriedStudentId = req.nextUrl.searchParams.get('studentId');
  let studentId: string | null = null;

  if (user.role === 'STUDENT') {
    if (!user.student) {
      throw new NotFoundError('Student profile not found');
    }
    studentId = user.student.id;
  } else if (user.role === 'PARENT') {
    if (!user.parent) {
      throw new NotFoundError('Parent profile not found');
    }
    if (!queriedStudentId) {
      throw new ValidationError('studentId required for parent role');
    }
    // Verify parent-child relationship
    const student = await db.student.findUnique({
      where: { id: queriedStudentId },
    });
    if (!student || !user.parent.childrenIds.includes(student.userId)) {
      throw new ForbiddenError('Not authorized to view this student\'s progress');
    }
    studentId = queriedStudentId;
  } else if (queriedStudentId) {
    // Educators/admins can view any student in their tenant
    studentId = queriedStudentId;
  } else {
    throw new ValidationError('studentId required for non-student roles');
  }

  // Get the standard
  const standard = await db.standard.findUnique({
    where: { id: standardId },
    include: {
      topics: {
        include: {
          learningObjectives: true,
        },
      },
    },
  });

  if (!standard) {
    throw new NotFoundError('Standard not found');
  }

  // Get progress for this standard
  const progress = await db.progress.findUnique({
    where: {
      studentId_standardId: {
        studentId,
        standardId,
      },
    },
  });

  // Get assessment history for this standard
  const assessments = await db.assessment.findMany({
    where: {
      standardId,
      session: {
        studentId,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
    select: {
      id: true,
      question: true,
      isCorrect: true,
      score: true,
      bloomsLevel: true,
      difficulty: true,
      createdAt: true,
      type: true,
    },
  });

  // Calculate statistics
  const totalAssessments = assessments.length;
  const correctCount = assessments.filter(a => a.isCorrect === true).length;
  const averageScore = assessments.length > 0
    ? assessments.reduce((sum, a) => sum + (a.score || 0), 0) / assessments.length
    : 0;

  // Get related standards (prerequisites and dependents)
  const relatedStandards = await db.standard.findMany({
    where: {
      OR: [
        { dependents: { some: { id: standardId } } },
        { prerequisites: { some: { id: standardId } } },
      ],
    },
    select: {
      id: true,
      code: true,
      description: true,
    },
  });

  return NextResponse.json({
    data: {
      standard: {
        id: standard.id,
        code: standard.code,
        description: standard.description,
        subject: standard.subject,
        gradeLevel: standard.gradeLevel,
        domain: standard.domain,
        cluster: standard.cluster,
      },
      progress: {
        masteryLevel: progress?.masteryLevel || 0,
        assessmentCount: progress?.assessmentCount || 0,
        lastAssessedAt: progress?.lastAssessedAt,
      },
      statistics: {
        totalAssessments,
        correctCount,
        averageScore: Math.round(averageScore * 10) / 10,
        accuracyRate: totalAssessments > 0 ? Math.round((correctCount / totalAssessments) * 100) : 0,
      },
      assessmentHistory: assessments,
      topics: standard.topics,
      relatedStandards,
    },
  });
}, { rateLimit: { windowMs: 60_000, max: 60 } });
