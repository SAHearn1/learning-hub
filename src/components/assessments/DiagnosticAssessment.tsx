'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AssessmentCard } from './AssessmentCard';
import type { BloomsLevel, Subject } from '@prisma/client';

interface DiagnosticAssessmentProps {
  studentId: string;
  sessionId: string;
  subject: Subject;
  gradeLevel: number;
  onComplete?: (results: any) => void;
}

interface Assessment {
  id: string;
  question: string;
  type: 'DIAGNOSTIC';
  difficulty: number;
  bloomsLevel: BloomsLevel;
  metadata?: any;
}

export function DiagnosticAssessment({
  studentId,
  sessionId,
  subject,
  gradeLevel,
  onComplete,
}: DiagnosticAssessmentProps) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, { response: string; feedback: any }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    generateAssessment();
  }, []);

  const generateAssessment = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assessments/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          sessionId,
          subject,
          gradeLevel,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate assessment');
      }

      const data = await response.json();
      setAssessments(data.assessments);
    } catch (error) {
      console.error('Error generating assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async (assessmentId: string, response: string) => {
    try {
      setSubmitting(true);
      const submitResponse = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentResponse: response }),
      });

      if (!submitResponse.ok) {
        throw new Error('Failed to submit response');
      }

      const data = await submitResponse.json();

      setResponses({
        ...responses,
        [assessmentId]: {
          response,
          feedback: data.feedback,
        },
      });
      setShowFeedback(true);
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < assessments.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowFeedback(false);
    } else {
      // Assessment complete
      if (onComplete) {
        onComplete(responses);
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Generating your personalized assessment...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (assessments.length === 0) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="text-center text-muted-foreground">No assessments available</p>
        </CardContent>
      </Card>
    );
  }

  const currentAssessment = assessments[currentIndex];
  const progress = ((currentIndex + 1) / assessments.length) * 100;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Diagnostic Assessment - {subject}</CardTitle>
          <CardDescription>
            Question {currentIndex + 1} of {assessments.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="mb-4" />
        </CardContent>
      </Card>

      <AssessmentCard
        assessment={currentAssessment}
        onSubmit={handleSubmitResponse}
        showFeedback={showFeedback}
        feedback={responses[currentAssessment.id]?.feedback}
      />

      {showFeedback && (
        <div className="flex justify-end">
          <Button onClick={handleNext} size="lg">
            {currentIndex < assessments.length - 1 ? 'Next Question →' : 'Complete Assessment'}
          </Button>
        </div>
      )}

      {submitting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <Card>
            <CardContent className="py-6 px-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm">Evaluating your response...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
