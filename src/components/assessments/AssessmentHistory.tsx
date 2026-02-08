'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AssessmentType } from '@prisma/client';

interface AssessmentHistoryProps {
  studentId?: string;
  sessionId?: string;
  filterType?: AssessmentType;
}

interface HistoricalAssessment {
  id: string;
  type: AssessmentType;
  createdAt: string;
  score?: number;
  isCorrect?: boolean;
  bloomsLevel: string;
  session: {
    subject: string;
    student: {
      user: {
        firstName: string;
        lastName: string;
      };
    };
  };
}

const TYPE_COLORS: Record<AssessmentType, string> = {
  DIAGNOSTIC: 'bg-info-100 text-info-800',
  FORMATIVE: 'bg-primary-100 text-primary-800',
  SUMMATIVE: 'bg-subject-ela-light text-subject-ela-dark',
  PRACTICE: 'bg-secondary-100 text-secondary-800',
};

export function AssessmentHistory({
  studentId,
  sessionId,
  filterType,
}: AssessmentHistoryProps) {
  const [assessments, setAssessments] = useState<HistoricalAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<AssessmentType | 'ALL'>(filterType || 'ALL');

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/api/assessments/diagnostic?'; // Base endpoint
      
      if (studentId) {
        url += `studentId=${studentId}`;
      } else if (sessionId) {
        url += `sessionId=${sessionId}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to load assessment history');
      }

      const data = await response.json();
      setAssessments(data.assessments || []);
    } catch (error) {
      console.error('Error loading assessment history:', error);
    } finally {
      setLoading(false);
    }
  }, [studentId, sessionId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, selectedType]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredAssessments =
    selectedType === 'ALL'
      ? assessments
      : assessments.filter((a) => a.type === selectedType);

  const averageScore =
    filteredAssessments.length > 0
      ? filteredAssessments
          .filter((a) => a.score !== null && a.score !== undefined)
          .reduce((sum, a) => sum + (a.score || 0), 0) / filteredAssessments.length
      : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assessment History</CardTitle>
          <CardDescription>
            Review past assessments and track progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={selectedType === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType('ALL')}
            >
              All
            </Button>
            {(['DIAGNOSTIC', 'FORMATIVE', 'SUMMATIVE', 'PRACTICE'] as AssessmentType[]).map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
              >
                {type}
              </Button>
            ))}
          </div>

          {/* Summary Stats */}
          {filteredAssessments.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-neutral-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {filteredAssessments.length}
                </div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {averageScore.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Avg Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">
                  {filteredAssessments.filter((a) => a.isCorrect).length}
                </div>
                <div className="text-xs text-muted-foreground">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-error-600">
                  {filteredAssessments.filter((a) => a.isCorrect === false).length}
                </div>
                <div className="text-xs text-muted-foreground">Incorrect</div>
              </div>
            </div>
          )}

          {/* Assessment List */}
          <div className="space-y-3">
            {filteredAssessments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No assessments found
              </p>
            ) : (
              filteredAssessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="border rounded-lg p-4 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={TYPE_COLORS[assessment.type]}>
                          {assessment.type}
                        </Badge>
                        <Badge variant="outline">{assessment.bloomsLevel}</Badge>
                        <Badge variant="outline">{assessment.session.subject}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(assessment.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      {assessment.score !== null && assessment.score !== undefined && (
                        <div className="text-2xl font-bold">
                          {assessment.score}%
                        </div>
                      )}
                      {assessment.isCorrect !== null && assessment.isCorrect !== undefined && (
                        <div className="text-2xl">
                          {assessment.isCorrect ? '✅' : '❌'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
