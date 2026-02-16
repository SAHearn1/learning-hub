'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  FileText,
  Calendar,
  ClipboardList,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Assignment {
  id: string;
  title: string;
  description?: string | null;
  type: AssignmentType;
  dueDate: string | null;
  points: number;
  published: boolean;
  createdAt: string;
  _count: { submissions: number };
}

type AssignmentType =
  | 'HOMEWORK'
  | 'QUIZ'
  | 'TEST'
  | 'PROJECT'
  | 'DISCUSSION'
  | 'FIVE_R_SESSION';

const ASSIGNMENT_TYPES: { value: AssignmentType; label: string }[] = [
  { value: 'HOMEWORK', label: 'Homework' },
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'TEST', label: 'Test' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'DISCUSSION', label: 'Discussion' },
  { value: 'FIVE_R_SESSION', label: '5R Session' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EducatorAssignmentsClient() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Class selector
  const [classId, setClassId] = useState('');

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<AssignmentType>('HOMEWORK');
  const [dueDate, setDueDate] = useState('');
  const [points, setPoints] = useState(100);
  const [published, setPublished] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch assignments
  // -----------------------------------------------------------------------

  const fetchAssignments = useCallback(async () => {
    if (!classId.trim()) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/lms/assignments?classId=${encodeURIComponent(classId)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Failed to load assignments (${res.status})`);
      }
      const json = await res.json();
      setAssignments(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void fetchAssignments();
  }, [fetchAssignments]);

  // -----------------------------------------------------------------------
  // Create assignment
  // -----------------------------------------------------------------------

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setType('HOMEWORK');
    setDueDate('');
    setPoints(100);
    setPublished(false);
    setFormError(null);
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!classId.trim()) {
      setFormError('Please enter a class ID first');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload: Record<string, unknown> = {
        classId,
        title: title.trim(),
        type,
        points,
        published,
      };
      if (description.trim()) payload.description = description.trim();
      if (dueDate) payload.dueDate = new Date(dueDate).toISOString();

      const res = await fetch('/api/lms/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Failed to create assignment (${res.status})`);
      }

      setDialogOpen(false);
      resetForm();
      await fetchAssignments();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  const formatDate = (iso: string | null) => {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const typeLabel = (t: AssignmentType) =>
    ASSIGNMENT_TYPES.find((a) => a.value === t)?.label ?? t;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0C3B2E]">Assignments</h1>
          <p className="mt-1 text-neutral-600">
            Create, manage, and track assignment submissions for your classes.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#0C3B2E] hover:bg-[#0C3B2E]/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Assignment
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Assignment</DialogTitle>
              <DialogDescription>
                Add a new assignment to the selected class.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Title */}
              <div className="space-y-1">
                <label htmlFor="create-title" className="text-sm font-medium">
                  Title
                </label>
                <input
                  id="create-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Assignment title"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label htmlFor="create-desc" className="text-sm font-medium">
                  Description (optional)
                </label>
                <Textarea
                  id="create-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instructions, rubric notes, etc."
                  rows={3}
                />
              </div>

              {/* Type */}
              <div className="space-y-1">
                <label htmlFor="create-type" className="text-sm font-medium">
                  Type
                </label>
                <select
                  id="create-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as AssignmentType)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {ASSIGNMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date + Points row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="create-due" className="text-sm font-medium">
                    Due Date
                  </label>
                  <input
                    id="create-due"
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="create-points" className="text-sm font-medium">
                    Points
                  </label>
                  <input
                    id="create-points"
                    type="number"
                    min={0}
                    max={1000}
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              {/* Published toggle */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span>Publish immediately (visible to students)</span>
              </label>

              {formError && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setDialogOpen(false); resetForm(); }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleCreate()}
                disabled={submitting}
                className="bg-[#0C3B2E] hover:bg-[#0C3B2E]/90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Class ID input */}
      <Card>
        <CardContent className="pt-6">
          <label htmlFor="classId" className="mb-1 block text-sm font-medium text-neutral-700">
            Class ID
          </label>
          <input
            id="classId"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            placeholder="Enter class ID to view assignments"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </CardContent>
      </Card>

      {/* Assignment list */}
      {!classId.trim() && (
        <div className="flex flex-col items-center gap-2 py-12 text-neutral-500">
          <ClipboardList className="h-10 w-10" />
          <p className="text-sm">Enter a class ID above to view its assignments.</p>
        </div>
      )}

      {classId.trim() && loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#0C3B2E]" />
          <span className="ml-2 text-sm text-neutral-600">Loading assignments...</span>
        </div>
      )}

      {classId.trim() && error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {classId.trim() && !loading && !error && assignments.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-neutral-500">
          <FileText className="h-10 w-10" />
          <p className="text-sm">No assignments found for this class.</p>
        </div>
      )}

      {!loading && !error && assignments.length > 0 && (
        <div className="space-y-3">
          {assignments.map((a) => (
            <Card key={a.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-[#0C3B2E]" />
                    <CardTitle className="text-lg">{a.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.published ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <Eye className="mr-1 h-3 w-3" />
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <EyeOff className="mr-1 h-3 w-3" />
                        Draft
                      </Badge>
                    )}
                    <Badge variant="outline">{typeLabel(a.type)}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Due: {formatDate(a.dueDate)}
                  </span>
                  <span>Points: {a.points}</span>
                  <span>Submissions: {a._count.submissions}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
