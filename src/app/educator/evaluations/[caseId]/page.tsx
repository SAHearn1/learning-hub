import { redirect, notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { CaseStatusBadge } from '@/components/evaluation/CaseStatusBadge';
import { CaseTimeline } from '@/components/evaluation/CaseTimeline';
import { EligibilityPanel } from '@/components/evaluation/EligibilityPanel';
import type { TimelineEntry } from '@/components/evaluation/CaseTimeline';
import type { EligibilityData } from '@/components/evaluation/EligibilityPanel';

export const dynamic = 'force-dynamic';

const STAFF_ROLES = ['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in');
  if (!STAFF_ROLES.includes(user.role)) redirect('/dashboard');

  const { caseId } = await params;

  const evalCase = await db.evaluationCase.findUnique({
    where: { id: caseId },
    include: {
      student: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      transitions: { orderBy: { createdAt: 'asc' } },
      plan: true,
      assignments: true,
      assessments: true,
      consents: { orderBy: { createdAt: 'desc' } },
      eligibilityMeeting: true,
      eligibilityDecision: true,
    },
  });

  if (!evalCase || evalCase.tenantId !== user.tenantId) notFound();

  const timelineEntries: TimelineEntry[] = evalCase.transitions.map((t) => ({
    id: t.id,
    fromState: t.fromState,
    toState: t.toState,
    transitionBy: t.transitionBy,
    reason: t.reason,
    createdAt: t.createdAt.toISOString(),
  }));

  const eligibility: EligibilityData | null = evalCase.eligibilityDecision
    ? {
        outcome: evalCase.eligibilityDecision.outcome,
        disabilityCategory: evalCase.eligibilityDecision.disabilityCategory,
        rationale: evalCase.eligibilityDecision.rationale,
        decisionDate: evalCase.eligibilityDecision.decisionDate.toISOString(),
      }
    : null;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {evalCase.student.user.firstName} {evalCase.student.user.lastName}
          </h1>
          <p className="mt-1 text-neutral-600">
            {evalCase.caseType === 'INITIAL'
              ? 'Initial Evaluation'
              : evalCase.caseType === 'REEVALUATION'
                ? 'Reevaluation'
                : 'Dismissal'}
          </p>
        </div>
        <CaseStatusBadge state={evalCase.currentState} />
      </div>

      {/* Key Dates */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="text-xs text-neutral-500">Referral Date</div>
          <div className="mt-1 text-sm font-medium text-neutral-900">
            {evalCase.referralDate
              ? new Date(evalCase.referralDate).toLocaleDateString()
              : 'N/A'}
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="text-xs text-neutral-500">Consent Received</div>
          <div className="mt-1 text-sm font-medium text-neutral-900">
            {evalCase.consentReceivedDate
              ? new Date(evalCase.consentReceivedDate).toLocaleDateString()
              : 'Pending'}
          </div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="text-xs text-neutral-500">Evaluation Due</div>
          <div className="mt-1 text-sm font-medium">
            {evalCase.evaluationDueDate ? (
              <>
                <span
                  className={
                    new Date(evalCase.evaluationDueDate) < new Date() &&
                    evalCase.currentState !== 'CLOSED'
                      ? 'text-red-600'
                      : 'text-neutral-900'
                  }
                >
                  {new Date(evalCase.evaluationDueDate).toLocaleDateString()}
                </span>
                {new Date(evalCase.evaluationDueDate) < new Date() &&
                  evalCase.currentState !== 'CLOSED' && (
                    <span className="ml-1 text-red-600 text-xs font-medium">OVERDUE</span>
                  )}
              </>
            ) : (
              <span className="text-neutral-900">Not set</span>
            )}
          </div>
        </div>
      </div>

      {/* Evaluation Plan */}
      {evalCase.plan && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900 mb-2">Evaluation Plan</h2>
          <div className="text-xs text-neutral-500">
            Domains:{' '}
            {(evalCase.plan.assessmentDomains as string[]).join(', ')}
          </div>
        </div>
      )}

      {/* Assignments & Assessments */}
      {evalCase.assignments.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900 mb-2">
            Assessments ({evalCase.assessments.length}/{evalCase.assignments.length} complete)
          </h2>
          <div className="space-y-2">
            {evalCase.assignments.map((a) => {
              const assessment = evalCase.assessments.find(
                (r) => r.assignmentId === a.id
              );
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-neutral-700">{a.domain}</span>
                  <span
                    className={`text-xs font-medium ${assessment ? 'text-green-600' : 'text-amber-600'}`}
                  >
                    {assessment ? 'Complete' : a.completedAt ? 'Complete' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Consent Records */}
      {evalCase.consents.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900 mb-2">Consent Records</h2>
          <div className="space-y-2">
            {evalCase.consents.map((cr) => (
              <div key={cr.id} className="flex items-center justify-between text-sm">
                <span className="text-neutral-700">
                  {cr.respondentName} &mdash; {cr.consentType}
                </span>
                <span
                  className={`text-xs font-medium ${cr.decision === 'GRANTED' ? 'text-green-600' : 'text-red-600'}`}
                >
                  {cr.decision}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Eligibility */}
      <EligibilityPanel decision={eligibility} />

      {/* State Transition Timeline */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-900 mb-3">Case Timeline</h2>
        <CaseTimeline entries={timelineEntries} />
      </div>
    </main>
  );
}
