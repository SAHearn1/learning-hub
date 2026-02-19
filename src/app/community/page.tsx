import Link from 'next/link';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const subjectLabels: Record<string, string> = {
  MATH: 'Math',
  SCIENCE: 'Science',
  LANGUAGE_ARTS: 'Language Arts',
  FINANCIAL_LITERACY: 'Financial Literacy',
};

export default async function CommunityPage() {
  const topics = await db.topic.findMany({
    select: {
      id: true,
      name: true,
      subject: true,
      description: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 8,
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold text-neutral-900">Community</h1>
      <p className="mt-3 text-neutral-700">
        Join family-safe study circles by launching shared prompts into your own guided session.
      </p>

      <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-neutral-900">Study Circle Launchpad</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Pick a topic, then open a structured one-on-one coaching session that starts from that shared challenge.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              href={`/learn?topic=${topic.id}`}
              className="rounded-xl border border-neutral-200 p-4 transition-colors hover:border-primary-300 hover:bg-primary-50"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                {subjectLabels[topic.subject] ?? topic.subject}
              </p>
              <p className="mt-1 font-semibold text-neutral-900">{topic.name}</p>
              <p className="mt-1 line-clamp-2 text-sm text-neutral-600">
                {topic.description}
              </p>
              <p className="mt-2 text-sm font-medium text-primary-700">Start guided session</p>
            </Link>
          ))}
        </div>
        {topics.length === 0 && (
          <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
            No topics are published yet. Visit <Link href="/explore" className="font-semibold text-primary-700">Explore</Link> to begin.
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-neutral-900">Collaboration Pathways</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Link href="/explore" className="rounded-lg border border-neutral-200 p-3 text-sm hover:bg-neutral-50">
            <p className="font-semibold text-neutral-900">Explore New Topics</p>
            <p className="mt-1 text-neutral-600">See recommendations and unlock pretests.</p>
          </Link>
          <Link href="/curriculum" className="rounded-lg border border-neutral-200 p-3 text-sm hover:bg-neutral-50">
            <p className="font-semibold text-neutral-900">Browse Curriculum</p>
            <p className="mt-1 text-neutral-600">Find standards-aligned material for group discussions.</p>
          </Link>
          <Link href="/progress" className="rounded-lg border border-neutral-200 p-3 text-sm hover:bg-neutral-50">
            <p className="font-semibold text-neutral-900">Track Progress</p>
            <p className="mt-1 text-neutral-600">Review what you mastered after each study circle.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}

