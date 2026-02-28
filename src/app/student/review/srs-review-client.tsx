'use client';
import { useState, useEffect, useCallback } from 'react';

type ReviewItem = {
  scheduleId: string;
  conceptName: string;
  subject: string;
  conceptType: string;
  daysUntilDue: number;
  reps: number;
};

type Rating = 1 | 2 | 3 | 4;

const RATING_LABELS: Record<Rating, { label: string; color: string; description: string }> = {
  1: { label: 'Again', color: 'bg-red-100 text-red-800 hover:bg-red-200', description: 'Completely forgot' },
  2: { label: 'Hard', color: 'bg-orange-100 text-orange-800 hover:bg-orange-200', description: 'Remembered with difficulty' },
  3: { label: 'Good', color: 'bg-green-100 text-green-800 hover:bg-green-200', description: 'Remembered correctly' },
  4: { label: 'Easy', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200', description: 'Perfect recall' },
};

function formatSubject(subject: string): string {
  return subject
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface SrsReviewClientProps {
  studentId: string;
}

export function SrsReviewClient({ studentId }: SrsReviewClientProps) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [completed, setCompleted] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ studentId });
      const res = await fetch(`/api/srs/due-items?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const itemList: ReviewItem[] = data.items ?? data.data ?? [];
        setItems(Array.isArray(itemList) ? itemList : []);
      } else {
        setLoadError('Could not load review items. Please try again.');
      }
    } catch {
      setLoadError('Network error loading review items.');
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    setStartTime(Date.now());
    setShowAnswer(false);
  }, [currentIndex]);

  async function handleRating(rating: Rating) {
    if (isSubmitting || !items[currentIndex]) return;
    setIsSubmitting(true);

    const responseTime = Date.now() - startTime;

    try {
      await fetch('/api/srs/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: items[currentIndex].scheduleId,
          rating,
          responseTime,
        }),
      });
    } catch {
      // silently continue to next item
    }

    const next = currentIndex + 1;
    setCompleted((c) => c + 1);

    if (next >= items.length) {
      setIsDone(true);
    } else {
      setCurrentIndex(next);
    }
    setIsSubmitting(false);
  }

  if (isLoading) {
    return (
      <div className="mt-8 flex items-center justify-center py-16">
        <div className="text-neutral-500">Loading review items...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700">{loadError}</p>
        <button
          onClick={loadItems}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isDone || items.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="text-3xl">🎉</p>
        <p className="mt-3 text-xl font-semibold text-emerald-800">Session complete!</p>
        {completed > 0 && (
          <p className="mt-1 text-emerald-700">
            You reviewed {completed} item{completed !== 1 ? 's' : ''}.
          </p>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Start New Session
        </button>
      </div>
    );
  }

  const item = items[currentIndex];
  const progress = (currentIndex / items.length) * 100;

  return (
    <div className="mt-6 space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-neutral-500 whitespace-nowrap">
          {currentIndex}/{items.length}
        </span>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm min-h-[240px] flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            {formatSubject(item.subject)}
          </span>
          <span className="text-xs text-neutral-400">&middot;</span>
          <span className="text-xs text-neutral-500 capitalize">
            {item.conceptType.toLowerCase()}
          </span>
          {item.reps > 0 && (
            <>
              <span className="text-xs text-neutral-400">&middot;</span>
              <span className="text-xs text-neutral-400">{item.reps} rep{item.reps !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>

        <div className="flex-1">
          <p className="text-lg font-medium text-neutral-900">{item.conceptName}</p>

          {showAnswer && (
            <div className="mt-4 border-t border-neutral-200 pt-4">
              <p className="text-sm font-semibold text-neutral-500 mb-1">Self-assessment</p>
              <p className="text-sm text-neutral-600">
                Rate how well you recalled this concept below.
              </p>
            </div>
          )}
        </div>

        {!showAnswer ? (
          <button
            onClick={() => setShowAnswer(true)}
            className="mt-6 w-full rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            I&apos;ve thought about it &mdash; Show rating options
          </button>
        ) : (
          <div className="mt-6 space-y-2">
            <p className="text-xs text-center text-neutral-500 mb-3">How well did you recall this?</p>
            <div className="grid grid-cols-4 gap-2">
              {([1, 2, 3, 4] as Rating[]).map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleRating(rating)}
                  disabled={isSubmitting}
                  className={`rounded-lg px-2 py-3 text-sm font-semibold transition-colors ${RATING_LABELS[rating].color} disabled:opacity-50`}
                >
                  <div>{RATING_LABELS[rating].label}</div>
                  <div className="text-xs font-normal mt-0.5 opacity-75">
                    {RATING_LABELS[rating].description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
