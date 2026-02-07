'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AssessmentCard } from './AssessmentCard';
import { AssessmentResults } from './AssessmentResults';
import type { BloomsLevel, Subject } from '@prisma/client';

interface SummativeAssessmentProps {
  studentId: string;
  sessionId: string;
  topicId?: string;
  topicName: string;
  learningObjectives: string[];
  onComplete?: (results: any) => void;
}

interface Assessment {
  id: string;
  question: string;
  type: 'SUMMATIVE';
  difficulty: number;
  bloomsLevel: BloomsLevel;
  metadata?: any;
}

export function SummativeAssessment({
  studentId,
  sessionId,
  topicId,
  topicName,
  learningObjectives,
  onComplete,
}: SummativeAssessmentProps) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, { response: string; feedback: any }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    generateAssessment();
  }, []);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining === 0 || showResults) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, showResults]);

  const generateAssessment = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assessments/summative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          sessionId,
          topicId,
          topicName,
          learningObjectives,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate assessment');
      }

      const data = await response.json();
      setAssessments(data.assessments);
      
      // Set timer: 5 minutes per question
      setTimeRemaining(data.assessments.length * 300);
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
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < assessments.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleReview = () => {
    setReviewing(true);
  };

  const handleSubmitAll = async () => {
    // Submit any unanswered questions with empty response
    for (const assessment of assessments) {
      if (!responses[assessment.id]) {
        await handleSubmitResponse(assessment.id, '');
      }
    }
    setShowResults(true);
    if (onComplete) {
      onComplete(responses);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Creating your mastery assessment...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    const completedAssessments = assessments.map((a) => ({
      ...a,
      studentResponse: responses[a.id]?.response || '',
      isCorrect: responses[a.id]?.feedback?.isCorrect || false,
      score: responses[a.id]?.feedback?.score || 0,
      feedback: responses[a.id]?.feedback?.feedback || '',
    }));

    return <AssessmentResults assessments={completedAssessments} />;
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

  const progress = ((Object.keys(responses).length) / assessments.length) * 100;
  const allAnswered = assessments.every((a) => responses[a.id]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Summative Assessment: {topicName}</CardTitle>
              <CardDescription>
                {reviewing ? 'Review Your Answers' : `Question ${currentIndex + 1} of ${assessments.length}`}
              </CardDescription>
            </div>
            {timeRemaining !== null && (
              <div className={`text-2xl font-bold ${timeRemaining < 300 ? 'text-red-600' : 'text-primary'}`}>
                ⏱️ {formatTime(timeRemaining)}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{Object.keys(responses).length} / {assessments.length} answered</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {!reviewing ? (
        <>
          <AssessmentCard
            assessment={assessments[currentIndex]}
            onSubmit={handleSubmitResponse}
            showFeedback={false}
          />

          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              ← Previous
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReview}>
                Review Answers
              </Button>
              
              {allAnswered && (
                <Button onClick={handleSubmitAll} variant="default">
                  Submit Assessment
                </Button>
              )}
            </div>

            <Button
              onClick={handleNext}
              disabled={currentIndex === assessments.length - 1}
            >
              Next →
            </Button>
          </div>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Review Your Answers</CardTitle>
            <CardDescription>
              Check your responses before submitting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-6">
              {assessments.map((assessment, index) => (
                <Button
                  key={assessment.id}
                  variant={responses[assessment.id] ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setCurrentIndex(index);
                    setReviewing(false);
                  }}
                >
                  {index + 1}
                </Button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-semibold">
                    {Object.keys(responses).length} / {assessments.length} questions answered
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {allAnswered ? 'All questions completed!' : 'Some questions still need answers'}
                  </div>
                </div>
                <Button
                  onClick={handleSubmitAll}
                  disabled={!allAnswered}
                  size="lg"
                >
                  Submit Assessment
                </Button>
              </div>

              {!allAnswered && (
                <p className="text-sm text-muted-foreground text-center">
                  Click on unanswered question numbers above to complete them
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {submitting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card>
            <CardContent className="py-6 px-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm">Saving your response...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
