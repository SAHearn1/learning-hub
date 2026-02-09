'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BRAND } from '@/brand/brand';

type Subject = 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS' | 'FINANCIAL_LITERACY';
type EngagementMode = 'FORWARD' | 'REVERSE' | 'ERROR_ANALYSIS' | 'MULTIPLE_PATHWAYS' | 'PROBLEM_POSING';

interface SessionSetupProps {
  onStart: (subject: Subject, mode: EngagementMode) => void;
  isLoading: boolean;
  startError?: string | null;
  onClearError?: () => void;
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
  FINANCIAL_LITERACY: {
    name: BRAND.subjects.FINANCIAL_LITERACY.name,
    color: BRAND.subjects.FINANCIAL_LITERACY.color,
    description: 'Learn budgeting, saving, credit, and investing habits',
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

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function SessionSetup({ onStart, isLoading, startError, onClearError }: SessionSetupProps) {
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.entries(SUBJECT_DETAILS) as [Subject, typeof SUBJECT_DETAILS[Subject]][]).map(
            ([key, subject]) => (
              <button
                key={key}
                onClick={() => {
                  onClearError?.();
                  setSelectedSubject(key);
                }}
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
                onClick={() => {
                  onClearError?.();
                  setSelectedMode(key);
                }}
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
          onClick={() => {
            onClearError?.();
            if (selectedSubject) {
              onStart(selectedSubject, selectedMode);
            }
          }}
          className="px-12"
        >
          {isLoading ? 'Starting...' : 'Begin Session'}
        </Button>
      </div>


      {startError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {startError}
        </div>
      )}

      {/* Recent Sessions */}
      {!historyLoading && recentSessions.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-neutral-800">Recent Sessions</h2>
          <div className="space-y-2">
            {recentSessions.map((session) => {
              const subjectInfo = SUBJECT_DETAILS[session.subject] ?? { name: session.subject, color: '#6B7280' };
              const modeInfo = MODE_DETAILS[session.engagementMode];
              return (
                <button
                  key={session.id}
                  onClick={() => {
                    onClearError?.();
                    setSelectedSubject(session.subject);
                    setSelectedMode(session.engagementMode);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors hover:bg-neutral-50"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: subjectInfo.color }}
                  >
                    {subjectInfo.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-neutral-800">
                      {subjectInfo.name}
                      {modeInfo && (
                        <span className="ml-2 text-xs font-normal text-neutral-500">
                          {modeInfo.name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {formatRelativeTime(session.startedAt)}
                    </div>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
