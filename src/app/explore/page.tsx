import { db } from '@/lib/db';
import { requirePageUser } from '@/lib/page-auth';
import { ExploreClient } from './explore-client';
import type { Subject } from '@prisma/client';

export default async function ExplorePage() {
  const user = await requirePageUser(['STUDENT']);

  // Determine pretest status per subject
  const subjects: Subject[] = ['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY'];
  const pretestStatus: Record<string, boolean> = {};
  const gradeLevel = user.student?.gradeLevel ?? 5;

  if (user.student) {
    const pretestSessions = await db.session.findMany({
      where: {
        studentId: user.student.id,
        metadata: {
          path: ['type'],
          equals: 'PRETEST',
        },
      },
      select: {
        subject: true,
        metadata: true,
      },
    });

    for (const subj of subjects) {
      const session = pretestSessions.find((s) => s.subject === subj);
      const meta = session?.metadata as Record<string, unknown> | null;
      pretestStatus[subj] = meta?.pretestCompleted === true;
    }
  } else {
    for (const subj of subjects) {
      pretestStatus[subj] = false;
    }
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <ExploreClient
        pretestStatus={pretestStatus as Record<Subject, boolean>}
        gradeLevel={gradeLevel}
      />
    </main>
  );
}
