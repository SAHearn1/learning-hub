import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function StudentAccommodationsPage() {
  const user = await requirePageUser(['STUDENT']);
  const student = await db.student.findFirst({
    where: { id: user.id },
    include: { iepAccommodations: true },
  });

  const accommodations = student?.iepAccommodations ?? [];

  const descriptions: Record<string, string> = {
    EXTENDED_TIME: 'Additional time on assignments and assessments.',
    PREFERENTIAL_SEATING: 'Seating placement that supports focus and engagement.',
    REDUCED_ASSIGNMENTS: 'Modified workload to focus on key learning objectives.',
    TEXT_TO_SPEECH: 'Text read aloud by the platform during assessments and lessons.',
    SPEECH_TO_TEXT: 'Voice input converted to text for written responses.',
    VISUAL_AIDS: 'Graphic organizers, charts, and visual supports provided.',
    FREQUENT_BREAKS: 'Scheduled breaks during longer activities.',
    MODIFIED_ASSESSMENTS: 'Adjusted assessment format or reduced question count.',
    BEHAVIOR_SUPPORT: 'Positive behavior intervention strategies and check-ins.',
    ALTERNATIVE_ASSESSMENT: 'Alternative ways to demonstrate knowledge.',
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold text-[#0C3B2E]">My Accommodations</h1>
        <p className="mt-1 text-neutral-600">
          Your IEP accommodations that are active on this platform.
        </p>
      </div>

      {accommodations.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center text-neutral-500">
          No accommodations are currently on file. If you believe this is an error,
          please contact your educator or school administrator.
        </div>
      ) : (
        <div className="space-y-3">
          {accommodations.map((a) => (
            <div
              key={a.id}
              className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <h3 className="font-semibold text-[#0C3B2E]">
                {a.type.replace(/_/g, ' ')}
              </h3>
              <p className="mt-1 text-sm text-neutral-600">
                {descriptions[a.type] ?? 'Accommodation active.'}
              </p>
              {a.description && (
                <p className="mt-2 text-sm text-neutral-500">
                  Details: {a.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
