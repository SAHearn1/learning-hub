import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

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
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ standardId: string }> }
) {
  const { standardId } = await params;
  const { userId: clerkId } = auth();
  
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
    include: { student: true, parent: true },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Determine which student's progress to view
  const queriedStudentId = req.nextUrl.searchParams.get('studentId');
  let studentId: string | null = null;

  if (user.role === 'STUDENT') {
    if (!user.student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }
    studentId = user.student.id;
  } else if (user.role === 'PARENT') {
    if (!user.parent) {
      return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });
    }
    if (!queriedStudentId) {
      return NextResponse.json({ error: 'studentId required for parent role' }, { status: 400 });
    }
    // Verify parent-child relationship
    const student = await db.student.findUnique({
      where: { id: queriedStudentId },
    });
    if (!student || !user.parent.childrenIds.includes(student.userId)) {
      return NextResponse.json({ error: 'Not authorized to view this student\'s progress' }, { status: 403 });
    }
    studentId = queriedStudentId;
  } else if (queriedStudentId) {
    // Educators/admins can view any student in their tenant
    studentId = queriedStudentId;
  } else {
    return NextResponse.json({ error: 'studentId required for non-student roles' }, { status: 400 });
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
    return NextResponse.json({ error: 'Standard not found' }, { status: 404 });
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
}
