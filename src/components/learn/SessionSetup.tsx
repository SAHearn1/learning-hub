'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BRAND } from '@/brand/brand';

type Subject = 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS';
type EngagementMode = 'FORWARD' | 'REVERSE' | 'ERROR_ANALYSIS' | 'MULTIPLE_PATHWAYS' | 'PROBLEM_POSING';

interface SessionSetupProps {
  onStart: (subject: Subject, mode: EngagementMode) => void;
  isLoading: boolean;
}

const SUBJECT_DETAILS: Record<Subject, { name: string; color: string; description: string }> = {
  MATH: {
    name: BRAND.subjects.MATH.name,
    color: BRAND.subjects.MATH.color,
    description: 'Explore numbers, patterns, and problem-solving',
  },
  SCIENCE: {
    name: BRAND.subjects.SCIENCE.name,
    color: BRAND.subjects.SCIENCE.color,
    description: 'Investigate the natural world and how things work',
  },
  LANGUAGE_ARTS: {
    name: BRAND.subjects.LANGUAGE_ARTS.name,
    color: BRAND.subjects.LANGUAGE_ARTS.color,
    description: 'Build reading, writing, and communication skills',
  },
};

const MODE_DETAILS: Record<EngagementMode, { name: string; description: string }> = {
  FORWARD: {
    name: BRAND.engagementModes.FORWARD.name,
    description: 'Work through problems step by step with guided support',
  },
  REVERSE: {
    name: BRAND.engagementModes.REVERSE.name,
    description: 'Start with the answer and figure out how to get there',
  },
  ERROR_ANALYSIS: {
    name: BRAND.engagementModes.ERROR_ANALYSIS.name,
    description: 'Find and fix mistakes in sample work',
  },
  MULTIPLE_PATHWAYS: {
    name: BRAND.engagementModes.MULTIPLE_PATHWAYS.name,
    description: 'Discover different ways to solve the same problem',
  },
  PROBLEM_POSING: {
    name: BRAND.engagementModes.PROBLEM_POSING.name,
    description: 'Create your own problems to challenge yourself and others',
  },
};

export function SessionSetup({ onStart, isLoading }: SessionSetupProps) {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedMode, setSelectedMode] = useState<EngagementMode>('FORWARD');

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-900">Start a Learning Session</h1>
        <p className="mt-2 text-neutral-600">
          Choose your subject and how you&apos;d like to learn today.
        </p>
      </div>

      {/* Subject Selection */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-neutral-800">Choose a Subject</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(Object.entries(SUBJECT_DETAILS) as [Subject, typeof SUBJECT_DETAILS[Subject]][]).map(
            ([key, subject]) => (
              <button
                key={key}
                onClick={() => setSelectedSubject(key)}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  selectedSubject === key
                    ? 'border-current shadow-md'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
                style={selectedSubject === key ? { borderColor: subject.color, color: subject.color } : undefined}
              >
                <div className="text-base font-semibold" style={{ color: subject.color }}>
                  {subject.name}
                </div>
                <p className="mt-1 text-sm text-neutral-600">{subject.description}</p>
              </button>
            ),
          )}
        </div>
      </div>

      {/* Engagement Mode Selection */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-neutral-800">How Would You Like to Learn?</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.entries(MODE_DETAILS) as [EngagementMode, typeof MODE_DETAILS[EngagementMode]][]).map(
            ([key, mode]) => (
              <button
                key={key}
                onClick={() => setSelectedMode(key)}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  selectedMode === key
                    ? 'border-primary-600 bg-primary-50 shadow-sm'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <div className={`text-sm font-semibold ${selectedMode === key ? 'text-primary-700' : 'text-neutral-800'}`}>
                  {mode.name}
                </div>
                <p className="mt-0.5 text-xs text-neutral-600">{mode.description}</p>
              </button>
            ),
          )}
        </div>
      </div>

      {/* Start Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          disabled={!selectedSubject || isLoading}
          onClick={() => selectedSubject && onStart(selectedSubject, selectedMode)}
          className="px-12"
        >
          {isLoading ? 'Starting...' : 'Begin Session'}
        </Button>
      </div>
    </div>
  );
}
