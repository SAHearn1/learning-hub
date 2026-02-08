'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ReviewItem {
  id: string;
  type: string;
  question: string;
  score: number | null;
  studentResponse: string | null;
  createdAt: string;
  studentName: string;
  metadata?: { educatorReview?: { reviewedAt?: string } };
}

export function EducatorReviewQueue() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [rubricScore, setRubricScore] = useState('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/assessments/review');
    const data = await res.json();
    setItems(data.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const pending = useMemo(() => items.filter((i) => !i.metadata?.educatorReview?.reviewedAt), [items]);

  const submitReview = async () => {
    if (!selected) return;
    await fetch('/api/assessments/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessmentId: selected.id,
        rubricScore: Number(rubricScore),
        comments,
      }),
    });
    setSelected(null);
    setRubricScore('');
    setComments('');
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Educator Review Workflow</CardTitle>
        <CardDescription>Review submitted assessments with rubric scoring and notes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p className="text-sm text-muted-foreground">Loading reviews...</p> : null}
        {!loading && pending.length === 0 ? <p className="text-sm text-muted-foreground">No pending reviews.</p> : null}
        <div className="space-y-2">
          {pending.map((item) => (
            <button
              key={item.id}
              className="w-full rounded-md border p-3 text-left hover:bg-muted"
              onClick={() => setSelected(item)}
            >
              <div className="text-sm font-medium">{item.studentName} · {item.type}</div>
              <div className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</div>
              <div className="mt-1 line-clamp-2 text-sm">{item.question}</div>
            </button>
          ))}
        </div>

        {selected ? (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-semibold">Rubric Review: {selected.studentName}</p>
            <p className="text-sm text-muted-foreground">{selected.question}</p>
            <p className="rounded bg-muted p-2 text-sm">{selected.studentResponse || 'No response provided.'}</p>
            <input
              type="number"
              min={0}
              max={100}
              value={rubricScore}
              onChange={(e) => setRubricScore(e.target.value)}
              placeholder="Rubric score (0-100)"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Feedback comments for student/family/educator records"
              rows={4}
            />
            <div className="flex gap-2">
              <Button onClick={submitReview} disabled={!rubricScore || !comments}>Submit Review</Button>
              <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
