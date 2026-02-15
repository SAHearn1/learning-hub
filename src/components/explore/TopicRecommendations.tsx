'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MasteryIndicator } from '@/components/curriculum/mastery-indicator';
import type { Subject } from '@prisma/client';

interface TopicData {
  id: string;
  name: string;
  description: string;
  gradeLevel: number[];
  estimatedDuration: number;
  mastery: number;
  masteryStatus: string;
  masteryDescription: string;
}

interface TopicRecommendationsProps {
  subject: Subject;
}

export function TopicRecommendations({ subject }: TopicRecommendationsProps) {
  const router = useRouter();
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTopics() {
      try {
        const res = await fetch(`/api/explore/topics?subject=${subject}`);
        if (!res.ok) {
          throw new Error('Failed to load topics');
        }
        const { data } = await res.json();
        if (!cancelled) {
          setTopics(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load topics');
          setLoading(false);
        }
      }
    }

    fetchTopics();
    return () => { cancelled = true; };
  }, [subject]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        <p className="text-sm text-neutral-600">Loading topics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center">
        <p className="text-sm text-neutral-600">No topics available for this subject yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        Topics are sorted by readiness — areas where you need the most practice appear first.
      </p>

      <div className="space-y-3">
        {topics.map((topic, index) => (
          <div
            key={topic.id}
            className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:bg-neutral-50"
          >
            {/* Rank indicator */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-500">
              {index + 1}
            </div>

            {/* Topic info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-neutral-900 truncate">
                  {topic.name}
                </h3>
                <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                  {topic.masteryStatus.replace('_', ' ')}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-neutral-500 line-clamp-1">
                {topic.description}
              </p>
              <MasteryIndicator
                masteryLevel={topic.mastery}
                size="sm"
                showLabel={false}
                className="mt-2 max-w-xs"
              />
            </div>

            {/* Action */}
            <Button
              size="sm"
              variant={topic.mastery < 50 ? 'default' : 'outline'}
              onClick={() => router.push(`/learn?topic=${topic.id}`)}
            >
              Start
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
