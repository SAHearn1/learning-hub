'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';

interface FormativeCheckProps {
  sessionId: string;
  currentTopic: string;
  recentContent?: string;
  onComplete?: (result: any) => void;
  onContinue?: () => void;
}

interface Question {
  id: string;
  question: string;
  type?: 'multiple_choice' | 'open_ended' | 'problem_solving';
  difficulty: number;
  bloomsLevel: string;
  metadata?: {
    options?: string[];
  };
}

export function FormativeCheck({
  sessionId,
  currentTopic,
  recentContent,
  onComplete,
  onContinue,
}: FormativeCheckProps) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [response, setResponse] = useState('');
  const [feedback, setFeedback] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const generateCheck = async () => {
    try {
      setLoading(true);
      setFeedback(null);
      setResponse('');

      const res = await fetch('/api/assessments/formative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          currentTopic,
          recentContent,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate formative check');
      }

      const data = await res.json();
      setQuestion(data.assessment);
    } catch (error) {
      console.error('Error generating formative check:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!question || !response.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/assessments/${question.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentResponse: response }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit response');
      }

      const data = await res.json();
      setFeedback(data.feedback);

      if (onComplete) {
        onComplete(data);
      }
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = () => {
    setQuestion(null);
    setResponse('');
    setFeedback(null);
    if (onContinue) {
      onContinue();
    }
  };

  if (!question && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quick Understanding Check</CardTitle>
          <CardDescription>
            Let&apos;s check your understanding of {currentTopic}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Ready for a quick check to see how you&apos;re doing?
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={generateCheck}>Start Check</Button>
        </CardFooter>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Generating your check...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!question) return null;

  const isMultipleChoice = question.type === 'multiple_choice';
  const options = question.metadata?.options || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Quick Check: {currentTopic}</CardTitle>
          <Badge>{question.bloomsLevel}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-base leading-relaxed">
          {question.question}
        </div>

        {!feedback && (
          <div className="space-y-4">
            {isMultipleChoice ? (
              <RadioGroup value={response} onValueChange={setResponse}>
                {options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`opt-${index}`} />
                    <label htmlFor={`opt-${index}`} className="text-sm cursor-pointer">
                      {option}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Your answer..."
                rows={4}
              />
            )}
          </div>
        )}

        {feedback && (
          <div className={`rounded-lg p-4 ${
            feedback.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{feedback.isCorrect ? '✓' : '?'}</span>
              <span className="font-semibold text-sm">
                {feedback.isCorrect ? 'Excellent!' : "Let&apos;s explore this..."}
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{feedback.feedback}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {!feedback ? (
          <Button onClick={handleSubmit} disabled={!response.trim() || submitting}>
            {submitting ? 'Checking...' : 'Submit'}
          </Button>
        ) : (
          <Button onClick={handleContinue}>
            Continue Learning
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
