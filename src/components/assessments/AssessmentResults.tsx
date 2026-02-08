'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { BloomsLevel } from '@prisma/client';

interface AssessmentResultsProps {
  assessments: Array<{
    id: string;
    question: string;
    studentResponse: string;
    isCorrect: boolean;
    score: number;
    feedback: string;
    bloomsLevel: BloomsLevel;
    difficulty: number;
    metadata?: any;
  }>;
  overallScore?: number;
  masteryLevel?: number;
  suggestions?: string[];
}

const BLOOMS_COLORS: Record<BloomsLevel, string> = {
  REMEMBER: 'bg-neutral-100 text-neutral-800',
  UNDERSTAND: 'bg-info-100 text-info-800',
  APPLY: 'bg-primary-100 text-primary-800',
  ANALYZE: 'bg-secondary-100 text-secondary-800',
  EVALUATE: 'bg-error-100 text-error-800',
  CREATE: 'bg-subject-ela-light text-subject-ela-dark',
};

export function AssessmentResults({
  assessments,
  overallScore,
  masteryLevel,
  suggestions,
}: AssessmentResultsProps) {
  const correctCount = assessments.filter((a) => a.isCorrect).length;
  const totalCount = assessments.length;
  const percentCorrect = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

  // Group by Bloom's level
  const byBloomsLevel = assessments.reduce((acc, assessment) => {
    if (!acc[assessment.bloomsLevel]) {
      acc[assessment.bloomsLevel] = [];
    }
    acc[assessment.bloomsLevel].push(assessment);
    return acc;
  }, {} as Record<BloomsLevel, typeof assessments>);

  return (
    <div className="space-y-6">
      {/* Overall Results Card */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Results</CardTitle>
          <CardDescription>
            {correctCount} out of {totalCount} questions correct
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Overall Score</span>
              <span className="text-2xl font-bold">{percentCorrect.toFixed(0)}%</span>
            </div>
            <Progress value={percentCorrect} className="h-3" />
          </div>

          {masteryLevel !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Mastery Level</span>
                <Badge variant={masteryLevel >= 70 ? 'default' : 'secondary'}>
                  {masteryLevel.toFixed(0)}%
                </Badge>
              </div>
              <Progress value={masteryLevel} className="h-3" />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{correctCount}</div>
              <div className="text-xs text-muted-foreground">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-error-600">
                {totalCount - correctCount}
              </div>
              <div className="text-xs text-muted-foreground">Incorrect</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-info-600">{totalCount}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance by Bloom's Level */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Thinking Level</CardTitle>
          <CardDescription>
            How you performed across different cognitive levels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(byBloomsLevel).map(([level, items]) => {
            const correct = items.filter((i) => i.isCorrect).length;
            const total = items.length;
            const percent = (correct / total) * 100;

            return (
              <div key={level} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className={BLOOMS_COLORS[level as BloomsLevel]}>
                    {level}
                  </Badge>
                  <span className="text-sm font-semibold">
                    {correct}/{total} ({percent.toFixed(0)}%)
                  </span>
                </div>
                <Progress value={percent} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Results</CardTitle>
          <CardDescription>
            Review each question and feedback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assessments.map((assessment, index) => (
            <div
              key={assessment.id}
              className={`border rounded-lg p-4 ${
                assessment.isCorrect
                  ? 'border-primary-200 bg-primary-50'
                  : 'border-secondary-200 bg-secondary-50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Question {index + 1}</span>
                  <Badge className={BLOOMS_COLORS[assessment.bloomsLevel]} variant="outline">
                    {assessment.bloomsLevel}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {assessment.isCorrect ? '✅' : '❌'}
                  </span>
                  <Badge variant={assessment.isCorrect ? 'default' : 'secondary'}>
                    {assessment.score}/100
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Question:</p>
                  <p className="text-sm">{assessment.question}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Your Answer:</p>
                  <p className="text-sm italic">{assessment.studentResponse}</p>
                </div>

                {assessment.metadata?.correctAnswer && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">
                      Correct Answer:
                    </p>
                    <p className="text-sm font-semibold">{assessment.metadata.correctAnswer}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Feedback:</p>
                  <p className="text-sm whitespace-pre-wrap">{assessment.feedback}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Remediation Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              Recommendations to improve your understanding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
