import { requirePageUser } from '@/lib/page-auth';
import { db } from '@/lib/db';
import { SrsReviewClient } from './srs-review-client';

export default async function StudentReviewPage() {
  const user = await requirePageUser(['STUDENT']);

  const now = new Date();
  const dueCount = user.student
    ? await db.reviewSchedule.count({
        where: {
          studentId: user.student.id,
          dueDate: { lte: now },
        },
      })
    : 0;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold text-neutral-900">Spaced Review</h1>
      <p className="mt-2 text-neutral-600">
        Review concepts at the optimal time to maximize long-term retention.
      </p>

      {dueCount === 0 ? (
        <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-2 font-semibold text-emerald-800">All caught up!</p>
          <p className="mt-1 text-sm text-emerald-700">
            No items due for review right now. Check back later.
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-neutral-600">
            {dueCount} item{dueCount !== 1 ? 's' : ''} due for review
          </p>
          {user.student && <SrsReviewClient studentId={user.student.id} />}
        </div>
      )}
    </main>
  );
}
