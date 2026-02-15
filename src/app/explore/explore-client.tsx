'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/brand/brand';
import { SubjectPretest } from '@/components/explore/SubjectPretest';
import { TopicRecommendations } from '@/components/explore/TopicRecommendations';
import type { Subject } from '@prisma/client';

type Phase = 'SELECT_SUBJECT' | 'PRETEST' | 'TOPICS';

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

interface ExploreClientProps {
  pretestStatus: Record<Subject, boolean>;
  gradeLevel: number;
}

export function ExploreClient({ pretestStatus, gradeLevel }: ExploreClientProps) {
  const [phase, setPhase] = useState<Phase>('SELECT_SUBJECT');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  // Track local pretest completions so we don't need a page reload
  const [localPretestDone, setLocalPretestDone] = useState<Record<string, boolean>>({});

  const isPretestDone = (subj: Subject) =>
    pretestStatus[subj] || localPretestDone[subj] === true;

  const handleSubjectSelect = useCallback(
    (subject: Subject) => {
      setSelectedSubject(subject);
      if (isPretestDone(subject)) {
        setPhase('TOPICS');
      } else {
        setPhase('PRETEST');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pretestStatus, localPretestDone],
  );

  const handlePretestComplete = useCallback(() => {
    if (selectedSubject) {
      setLocalPretestDone((prev) => ({ ...prev, [selectedSubject]: true }));
    }
    setPhase('TOPICS');
  }, [selectedSubject]);

  const handleBack = useCallback(() => {
    if (phase === 'TOPICS') {
      setPhase('SELECT_SUBJECT');
      setSelectedSubject(null);
    } else if (phase === 'PRETEST') {
      setPhase('SELECT_SUBJECT');
      setSelectedSubject(null);
    }
  }, [phase]);

  // Phase: SELECT_SUBJECT
  if (phase === 'SELECT_SUBJECT') {
    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-neutral-900">Explore Subjects</h1>
          <p className="mt-2 text-neutral-600">
            Choose a subject to discover what you already know and find your next learning steps.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(Object.entries(SUBJECT_DETAILS) as [Subject, (typeof SUBJECT_DETAILS)[Subject]][]).map(
            ([key, subject]) => {
              const done = isPretestDone(key);
              return (
                <button
                  key={key}
                  onClick={() => handleSubjectSelect(key)}
                  className="group rounded-xl border-2 border-neutral-200 bg-white p-6 text-left transition-all hover:border-current hover:shadow-lg"
                  style={{ '--tw-border-opacity': 1 } as React.CSSProperties}
                >
                  <div className="text-lg font-bold" style={{ color: subject.color }}>
                    {subject.name}
                  </div>
                  <p className="mt-1 text-sm text-neutral-600">{subject.description}</p>
                  <div className="mt-3">
                    {done ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        Pretest Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                        Take Pretest
                      </span>
                    )}
                  </div>
                </button>
              );
            },
          )}
        </div>
      </div>
    );
  }

  // Phase: PRETEST
  if (phase === 'PRETEST' && selectedSubject) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            Back
          </Button>
          <h1 className="text-2xl font-bold text-neutral-900">
            {SUBJECT_DETAILS[selectedSubject].name} Pretest
          </h1>
        </div>
        <SubjectPretest
          subject={selectedSubject}
          gradeLevel={gradeLevel}
          onComplete={handlePretestComplete}
        />
      </div>
    );
  }

  // Phase: TOPICS
  if (phase === 'TOPICS' && selectedSubject) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            Back
          </Button>
          <h1 className="text-2xl font-bold text-neutral-900">
            {SUBJECT_DETAILS[selectedSubject].name} Topics
          </h1>
        </div>
        <TopicRecommendations subject={selectedSubject} />
      </div>
    );
  }

  return null;
}
