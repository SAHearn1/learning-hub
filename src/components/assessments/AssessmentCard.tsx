'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import type { BloomsLevel } from '@prisma/client';

interface AssessmentCardProps {
  assessment: {
    id: string;
    question: string;
    type: AssessmentType;
    difficulty: number;
    bloomsLevel: BloomsLevel;
    metadata?: {
      type?: 'multiple_choice' | 'open_ended' | 'problem_solving';
      options?: string[];
      scaffoldHints?: string[];
    };
  };
  onSubmit: (assessmentId: string, response: string) => void;
  showFeedback?: boolean;
  feedback?: {
    isCorrect: boolean;
    score: number;
    feedback: string;
    scaffoldHints?: string[];
  };
}

type AssessmentType = 'DIAGNOSTIC' | 'FORMATIVE' | 'SUMMATIVE' | 'PRACTICE';

const BLOOMS_COLORS: Record<BloomsLevel, string> = {
  REMEMBER: 'bg-neutral-100 text-neutral-800',
  UNDERSTAND: 'bg-info-100 text-info-800',
  APPLY: 'bg-primary-100 text-primary-800',
  ANALYZE: 'bg-secondary-100 text-secondary-800',
  EVALUATE: 'bg-error-100 text-error-800',
  CREATE: 'bg-subject-ela-light text-subject-ela-dark',
};

const DIFFICULTY_STARS = ['⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'];

export function AssessmentCard({
  assessment,
  onSubmit,
  showFeedback = false,
  feedback,
}: AssessmentCardProps) {
  const [response, setResponse] = useState('');
  const [showHints, setShowHints] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);

  const isMultipleChoice = assessment.metadata?.type === 'multiple_choice';
  const options = assessment.metadata?.options || [];
  const scaffoldHints = assessment.metadata?.scaffoldHints || [];

  const handleSubmit = () => {
    if (response.trim()) {
      onSubmit(assessment.id, response);
    }
  };

  const handleShowNextHint = () => {
    if (hintLevel < scaffoldHints.length) {
      setHintLevel(hintLevel + 1);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Question</CardTitle>
          <div className="flex gap-2">
            <Badge className={BLOOMS_COLORS[assessment.bloomsLevel]}>
              {assessment.bloomsLevel}
            </Badge>
            <Badge variant="outline">
              {DIFFICULTY_STARS[assessment.difficulty - 1] || '⭐'}
            </Badge>
          </div>
        </div>
        <CardDescription>
          {assessment.type} Assessment
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-lg leading-relaxed whitespace-pre-wrap">
          {assessment.question}
        </div>

        {!showFeedback && (
          <div className="space-y-4">
            {isMultipleChoice ? (
              <RadioGroup value={response} onValueChange={setResponse}>
                {options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <label
                      htmlFor={`option-${index}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {option}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Type your answer here..."
                rows={6}
                className="resize-none"
              />
            )}

            {showHints && hintLevel > 0 && (
              <div className="bg-info-50 border border-info-200 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-info-900">Hints:</p>
                {scaffoldHints.slice(0, hintLevel).map((hint, index) => (
                  <p key={index} className="text-sm text-info-800">
                    {index + 1}. {hint}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {showFeedback && feedback && (
          <div className={`rounded-lg p-4 ${
            feedback.isCorrect ? 'bg-primary-50 border border-primary-200' : 'bg-secondary-50 border border-secondary-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{feedback.isCorrect ? '✓' : '?'}</span>
              <span className="font-semibold">
                {feedback.isCorrect ? 'Great work!' : "Let&apos;s think about this..."}
              </span>
              <Badge variant="secondary">Score: {feedback.score}/100</Badge>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {feedback.feedback}
            </p>

            {!feedback.isCorrect && feedback.scaffoldHints && feedback.scaffoldHints.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="font-semibold text-sm">Try thinking about:</p>
                {feedback.scaffoldHints.map((hint, index) => (
                  <p key={index} className="text-sm text-neutral-700">
                    • {hint}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {!showFeedback && (
          <>
            <Button onClick={handleSubmit} disabled={!response.trim()}>
              Submit Answer
            </Button>
            {scaffoldHints.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowHints(true);
                  handleShowNextHint();
                }}
                disabled={hintLevel >= scaffoldHints.length}
              >
                {showHints ? `Show Next Hint (${hintLevel}/${scaffoldHints.length})` : 'Need a Hint?'}
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
}
