import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

export const GET = withApiHandler(async () => {
  const user = await requireRole(['SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);
  const tenantId = user.tenantId;

  const [
    totalStudents,
    totalEducators,
    totalClasses,
    totalSessions,
    activeSessions,
    totalAssessments,
    totalGoals,
    activeGoals,
    openEvalCases,
    totalEvalCases,
    openDisciplineCases,
    consentGranted,
    pendingReviews,
  ] = await Promise.all([
    db.student.count({ where: { user: { tenantId } } }),
    db.user.count({ where: { tenantId, role: 'EDUCATOR' } }),
    db.class.count({ where: { tenantId } }),
    db.session.count({ where: { tenantId } }),
    db.session.count({ where: { tenantId, endedAt: null } }),
    db.assessment.count({ where: { session: { tenantId } } }),
    db.iepGoal.count({ where: { tenantId } }),
    db.iepGoal.count({ where: { tenantId, status: 'ACTIVE' } }),
    db.evaluationCase.count({ where: { tenantId, currentState: { not: 'CLOSED' } } }),
    db.evaluationCase.count({ where: { tenantId } }),
    db.disciplineCase.count({ where: { tenantId, currentState: { not: 'CLOSED' } } }),
    db.user.count({ where: { tenantId, role: 'STUDENT', consentStatus: 'GRANTED' } }),
    db.aiSuggestionReview.count({ where: { tenantId, reviewStatus: 'PENDING_REVIEW' } }),
  ]);

  const complianceRate = totalStudents > 0
    ? Math.round((consentGranted / totalStudents) * 100)
    : 100;

  return NextResponse.json({
    data: {
      students: { total: totalStudents, consentGranted, complianceRate },
      educators: { total: totalEducators },
      classes: { total: totalClasses },
      sessions: { total: totalSessions, active: activeSessions },
      assessments: { total: totalAssessments },
      iepGoals: { total: totalGoals, active: activeGoals },
      evaluations: { open: openEvalCases, total: totalEvalCases },
      discipline: { open: openDisciplineCases },
      pendingReviews,
    },
  });
});
