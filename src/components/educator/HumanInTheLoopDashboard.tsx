'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Check,
  X,
  Clock,
  AlertTriangle,
  Shield,
  FileText,
  ChevronRight,
  Filter,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewItem {
  id: string;
  tenantId: string;
  studentId: string;
  sessionId: string | null;
  suggestionType: string;
  originalContent: string;
  editedContent: string | null;
  reviewStatus: string;
  reviewerId: string | null;
  reviewerNotes: string | null;
  confidenceScore: number | null;
  guardrailFlags: Record<string, unknown> | null;
  contextSnapshot: Record<string, unknown> | null;
  priority: number;
  expiresAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  studentName: string;
}

interface ReviewStats {
  pendingCount: number;
  approvedToday: number;
  rejectedToday: number;
  reviewedToday: number;
  totalReviewed: number;
  avgReviewTimeMinutes: number;
  approvalRate: number;
}

interface PaginatedResponse {
  data: ReviewItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUGGESTION_TYPE_LABELS: Record<string, string> = {
  TUTORING_RESPONSE: 'Tutoring Response',
  IEP_RECOMMENDATION: 'IEP Recommendation',
  ASSESSMENT_FEEDBACK: 'Assessment Feedback',
  ACCOMMODATION_SUGGESTION: 'Accommodation Suggestion',
  PROGRESS_NOTE: 'Progress Note',
};

const SUGGESTION_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'TUTORING_RESPONSE', label: 'Tutoring Response' },
  { value: 'IEP_RECOMMENDATION', label: 'IEP Recommendation' },
  { value: 'ASSESSMENT_FEEDBACK', label: 'Assessment Feedback' },
  { value: 'ACCOMMODATION_SUGGESTION', label: 'Accommodation Suggestion' },
  { value: 'PROGRESS_NOTE', label: 'Progress Note' },
];

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: 'Pending Review',
  APPROVED: 'Approved',
  APPROVED_WITH_EDITS: 'Approved with Edits',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function getPriorityLabel(priority: number): string {
  if (priority >= 8) return 'Critical';
  if (priority >= 5) return 'High';
  if (priority >= 3) return 'Medium';
  return 'Low';
}

function getPriorityColor(priority: number): string {
  if (priority >= 8) return 'text-red-600 bg-red-50 border-red-200';
  if (priority >= 5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  if (priority >= 3) return 'text-blue-600 bg-blue-50 border-blue-200';
  return 'text-gray-600 bg-gray-50 border-gray-200';
}

function getConfidenceColor(score: number | null): string {
  if (score === null) return 'text-gray-500';
  if (score > 0.8) return 'text-green-600';
  if (score >= 0.5) return 'text-yellow-600';
  return 'text-red-600';
}

function getConfidenceLabel(score: number | null): string {
  if (score === null) return 'N/A';
  if (score > 0.8) return 'High';
  if (score >= 0.5) return 'Medium';
  return 'Low';
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'APPROVED':
    case 'APPROVED_WITH_EDITS':
      return 'default';
    case 'REJECTED':
      return 'destructive';
    case 'EXPIRED':
      return 'secondary';
    default:
      return 'outline';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConfidenceIndicator({ score }: { score: number | null }) {
  const color = getConfidenceColor(score);
  const label = getConfidenceLabel(score);
  const percentage = score !== null ? Math.round(score * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <Shield className={`h-4 w-4 ${color}`} />
      <span className={`text-sm font-medium ${color}`}>
        Confidence: {label} {score !== null && `(${percentage}%)`}
      </span>
    </div>
  );
}

function GuardrailFlags({ flags }: { flags: Record<string, unknown> | null }) {
  if (!flags || Object.keys(flags).length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(flags).map(([key, value]) => (
        <div
          key={key}
          className="flex items-center gap-1 rounded-md border border-yellow-200 bg-yellow-50 px-2 py-1 text-xs text-yellow-700"
        >
          <AlertTriangle className="h-3 w-3" />
          <span>{key}: {String(value)}</span>
        </div>
      ))}
    </div>
  );
}

function ContextSnapshot({ context }: { context: Record<string, unknown> | null }) {
  if (!context || Object.keys(context).length === 0) return null;

  return (
    <div className="rounded-md border bg-muted/50 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Context provided to AI:</p>
      <div className="space-y-1">
        {Object.entries(context).map(([key, value]) => (
          <div key={key} className="text-xs">
            <span className="font-medium text-muted-foreground">{key}:</span>{' '}
            <span className="text-foreground">
              {typeof value === 'string'
                ? truncateText(value, 200)
                : JSON.stringify(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewPanel({
  review,
  onAction,
  onClose,
  isSubmitting,
}: {
  review: ReviewItem;
  onAction: (
    decision: 'approved' | 'approved_with_edits' | 'rejected',
    editedContent?: string,
    notes?: string,
  ) => void;
  onClose: () => void;
  isSubmitting: boolean;
}) {
  const [editedContent, setEditedContent] = useState(review.originalContent);
  const [notes, setNotes] = useState('');
  const [hasEdited, setHasEdited] = useState(false);

  const handleContentChange = (value: string) => {
    setEditedContent(value);
    setHasEdited(value !== review.originalContent);
  };

  const handleApprove = () => {
    if (hasEdited) {
      onAction('approved_with_edits', editedContent, notes || undefined);
    } else {
      onAction('approved', undefined, notes || undefined);
    }
  };

  const handleReject = () => {
    if (!notes.trim()) {
      return;
    }
    onAction('rejected', undefined, notes);
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Review: {review.studentName}</CardTitle>
            <CardDescription>
              {SUGGESTION_TYPE_LABELS[review.suggestionType] ?? review.suggestionType} --{' '}
              {formatDate(review.createdAt)}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Confidence and priority indicators */}
        <div className="flex flex-wrap items-center gap-4">
          <ConfidenceIndicator score={review.confidenceScore} />
          <Badge className={getPriorityColor(review.priority)} variant="outline">
            {getPriorityLabel(review.priority)} Priority
          </Badge>
        </div>

        {/* Guardrail flags */}
        <GuardrailFlags flags={review.guardrailFlags} />

        {/* Context snapshot */}
        <ContextSnapshot context={review.contextSnapshot} />

        {/* Original AI content */}
        <div>
          <p className="mb-2 text-sm font-medium">Original AI-Generated Content:</p>
          <div className="rounded-md border-2 border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed">
            {review.originalContent}
          </div>
        </div>

        {/* Editable content area */}
        <div>
          <p className="mb-2 text-sm font-medium">
            Content for Record {hasEdited && <span className="text-yellow-600">(edited)</span>}:
          </p>
          <Textarea
            value={editedContent}
            onChange={(e) => handleContentChange(e.target.value)}
            rows={6}
            className="font-mono text-sm"
            placeholder="Edit the AI-generated content before approving..."
          />
        </div>

        {/* Reviewer notes */}
        <div>
          <p className="mb-2 text-sm font-medium">
            Reviewer Notes{' '}
            <span className="font-normal text-muted-foreground">(required for rejection)</span>:
          </p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add notes about your review decision..."
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 border-t pt-4">
          <Button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="mr-2 h-4 w-4" />
            {hasEdited ? 'Approve with Edits' : 'Approve as-is'}
          </Button>
          <Button
            onClick={handleReject}
            disabled={isSubmitting || !notes.trim()}
            variant="destructive"
          >
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsCards({ stats }: { stats: ReviewStats | null }) {
  if (!stats) {
    return <p className="text-sm text-muted-foreground">Loading statistics...</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Pending Reviews</CardDescription>
          <CardTitle className="text-3xl">{stats.pendingCount}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Awaiting educator review</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Reviewed Today</CardDescription>
          <CardTitle className="text-3xl">{stats.reviewedToday}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {stats.approvedToday} approved, {stats.rejectedToday} rejected
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Avg. Review Time</CardDescription>
          <CardTitle className="text-3xl">
            {stats.avgReviewTimeMinutes > 0 ? `${stats.avgReviewTimeMinutes}m` : '--'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Minutes per review today</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Approval Rate</CardDescription>
          <CardTitle className="text-3xl">
            {stats.approvalRate > 0 ? `${stats.approvalRate}%` : '--'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Of today&apos;s reviewed suggestions
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function HumanInTheLoopDashboard() {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingReviews, setPendingReviews] = useState<ReviewItem[]>([]);
  const [completedReviews, setCompletedReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority'>('createdAt');

  // Pagination
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingHasMore, setPendingHasMore] = useState(false);
  const [completedPage, setCompletedPage] = useState(1);
  const [completedTotal, setCompletedTotal] = useState(0);
  const [completedHasMore, setCompletedHasMore] = useState(false);

  const PAGE_SIZE = 20;

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchPendingReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(pendingPage),
        limit: String(PAGE_SIZE),
        sortBy,
        sortOrder: sortBy === 'priority' ? 'desc' : 'desc',
      });
      if (typeFilter) {
        params.set('suggestionType', typeFilter);
      }

      const res = await fetch(`/api/educator/reviews?${params}`);
      if (!res.ok) {
        throw new Error('Failed to fetch reviews');
      }
      const data: PaginatedResponse = await res.json();
      setPendingReviews(data.data);
      setPendingTotal(data.total);
      setPendingHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [pendingPage, typeFilter, sortBy]);

  const fetchCompletedReviews = useCallback(async () => {
    setCompletedLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(completedPage),
        limit: String(PAGE_SIZE),
        status: 'completed',
      });

      const res = await fetch(`/api/educator/reviews?${params}`);
      if (!res.ok) {
        throw new Error('Failed to fetch completed reviews');
      }
      const data: PaginatedResponse = await res.json();
      setCompletedReviews(data.data);
      setCompletedTotal(data.total);
      setCompletedHasMore(data.hasMore);
    } catch {
      // Silently handle completed tab errors
    } finally {
      setCompletedLoading(false);
    }
  }, [completedPage]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/educator/reviews/stats');
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.data);
    } catch {
      // Silently handle stats errors
    }
  }, []);

  useEffect(() => {
    fetchPendingReviews();
  }, [fetchPendingReviews]);

  useEffect(() => {
    if (activeTab === 'completed') {
      fetchCompletedReviews();
    }
  }, [activeTab, fetchCompletedReviews]);

  useEffect(() => {
    if (activeTab === 'statistics') {
      fetchStats();
    }
  }, [activeTab, fetchStats]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handleReviewAction = async (
    decision: 'approved' | 'approved_with_edits' | 'rejected',
    editedContent?: string,
    notes?: string,
  ) => {
    if (!selectedReview) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/educator/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: selectedReview.id,
          decision,
          editedContent,
          notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to submit review');
      }

      // Auto-advance to next pending review
      const currentIndex = pendingReviews.findIndex((r) => r.id === selectedReview.id);
      const remaining = pendingReviews.filter((r) => r.id !== selectedReview.id);

      if (remaining.length > 0) {
        const nextIndex = Math.min(currentIndex, remaining.length - 1);
        setSelectedReview(remaining[nextIndex]);
      } else {
        setSelectedReview(null);
      }

      // Refresh the pending list
      fetchPendingReviews();
      // Also refresh stats if visible
      if (activeTab === 'statistics') {
        fetchStats();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset pagination when filters change
  useEffect(() => {
    setPendingPage(1);
  }, [typeFilter, sortBy]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList>
        <TabsTrigger value="pending" className="gap-2">
          <Clock className="h-4 w-4" />
          Pending Reviews
          {pendingTotal > 0 && (
            <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {pendingTotal}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="completed" className="gap-2">
          <FileText className="h-4 w-4" />
          Completed
        </TabsTrigger>
        <TabsTrigger value="statistics" className="gap-2">
          <Shield className="h-4 w-4" />
          Statistics
        </TabsTrigger>
      </TabsList>

      {/* ================================================================= */}
      {/* PENDING REVIEWS TAB                                                */}
      {/* ================================================================= */}
      <TabsContent value="pending" className="space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 pt-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {SUGGESTION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'priority')}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="createdAt">Most Recent</option>
                <option value="priority">Highest Priority</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Error state */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading reviews...</p>
        )}

        {/* Empty state */}
        {!loading && pendingReviews.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Check className="mx-auto mb-4 h-12 w-12 text-green-500" />
              <p className="text-lg font-medium">All caught up</p>
              <p className="text-sm text-muted-foreground">
                There are no pending AI suggestions to review at this time.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Review list and detail panel */}
        {!loading && pendingReviews.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
            {/* Review list */}
            <div className="space-y-2">
              {pendingReviews.map((review) => (
                <button
                  key={review.id}
                  className={`w-full rounded-md border p-3 text-left transition-colors hover:bg-muted ${
                    selectedReview?.id === review.id
                      ? 'border-primary bg-primary/5'
                      : ''
                  }`}
                  onClick={() => setSelectedReview(review)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{review.studentName}</span>
                        <Badge variant="outline" className="text-xs">
                          {SUGGESTION_TYPE_LABELS[review.suggestionType] ?? review.suggestionType}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${getPriorityColor(review.priority)}`}
                        >
                          {getPriorityLabel(review.priority)}
                        </span>
                        {review.confidenceScore !== null && (
                          <span
                            className={`text-xs ${getConfidenceColor(review.confidenceScore)}`}
                          >
                            {Math.round(review.confidenceScore * 100)}% confidence
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {truncateText(review.originalContent, 120)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </button>
              ))}

              {/* Pagination */}
              {pendingTotal > PAGE_SIZE && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Showing {(pendingPage - 1) * PAGE_SIZE + 1}-
                    {Math.min(pendingPage * PAGE_SIZE, pendingTotal)} of {pendingTotal}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pendingPage <= 1}
                      onClick={() => setPendingPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!pendingHasMore}
                      onClick={() => setPendingPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Detail panel */}
            <div>
              {selectedReview ? (
                <ReviewPanel
                  key={selectedReview.id}
                  review={selectedReview}
                  onAction={handleReviewAction}
                  onClose={() => setSelectedReview(null)}
                  isSubmitting={isSubmitting}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Select a suggestion from the list to review it.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </TabsContent>

      {/* ================================================================= */}
      {/* COMPLETED TAB                                                      */}
      {/* ================================================================= */}
      <TabsContent value="completed" className="space-y-4">
        {completedLoading && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading completed reviews...
          </p>
        )}

        {!completedLoading && completedReviews.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-lg font-medium">No completed reviews yet</p>
              <p className="text-sm text-muted-foreground">
                Completed reviews will appear here after you process pending suggestions.
              </p>
            </CardContent>
          </Card>
        )}

        {!completedLoading && completedReviews.length > 0 && (
          <div className="space-y-2">
            {completedReviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{review.studentName}</span>
                        <Badge variant="outline" className="text-xs">
                          {SUGGESTION_TYPE_LABELS[review.suggestionType] ?? review.suggestionType}
                        </Badge>
                        <Badge variant={getStatusBadgeVariant(review.reviewStatus)}>
                          {STATUS_LABELS[review.reviewStatus] ?? review.reviewStatus}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {truncateText(review.editedContent ?? review.originalContent, 200)}
                      </p>
                      {review.reviewerNotes && (
                        <p className="mt-1 text-xs italic text-muted-foreground">
                          Note: {truncateText(review.reviewerNotes, 150)}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      {review.reviewedAt ? formatDate(review.reviewedAt) : '--'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination */}
            {completedTotal > PAGE_SIZE && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Showing {(completedPage - 1) * PAGE_SIZE + 1}-
                  {Math.min(completedPage * PAGE_SIZE, completedTotal)} of {completedTotal}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={completedPage <= 1}
                    onClick={() => setCompletedPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!completedHasMore}
                    onClick={() => setCompletedPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </TabsContent>

      {/* ================================================================= */}
      {/* STATISTICS TAB                                                     */}
      {/* ================================================================= */}
      <TabsContent value="statistics" className="space-y-6">
        <StatsCards stats={stats} />

        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Review Activity Summary</CardTitle>
              <CardDescription>
                Overview of AI suggestion review activity for your organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Reviewed (All Time)</p>
                  <p className="text-2xl font-bold">{stats.totalReviewed}</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground">Pending Queue</p>
                  <p className="text-2xl font-bold">{stats.pendingCount}</p>
                  {stats.pendingCount > 10 && (
                    <p className="mt-1 text-xs text-yellow-600">
                      Consider reviewing pending items to maintain timely feedback.
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-md border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">
                  All AI-generated suggestions are reviewed by educators before becoming part of
                  official student records. This human-in-the-loop process ensures accuracy,
                  appropriateness, and compliance with educational standards.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
