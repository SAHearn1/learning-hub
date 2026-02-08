'use client';

import { useState, useMemo } from 'react';
import { Subject, StandardFramework } from '@prisma/client';
import { TopicCard } from '@/components/curriculum/topic-card';
import { CurriculumFilters } from '@/components/curriculum/curriculum-filters';

interface Topic {
  id: string;
  name: string;
  subject: Subject;
  gradeLevel: number[];
  description: string;
  estimatedDuration: number;
  standards: {
    code: string;
    framework: StandardFramework;
    subject: Subject;
  }[];
}

interface Progress {
  topicId: string;
  masteryLevel: number;
}

interface CurriculumClientProps {
  topics: Topic[];
  userProgress: Progress[];
}

export function CurriculumClient({ topics, userProgress }: CurriculumClientProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeLevels, setGradeLevels] = useState<number[]>([]);
  const [frameworks, setFrameworks] = useState<StandardFramework[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTopics = useMemo(() => {
    return topics.filter(topic => {
      // Subject filter
      if (subjects.length > 0 && !subjects.includes(topic.subject)) {
        return false;
      }

      // Grade level filter
      if (gradeLevels.length > 0) {
        const hasMatchingGrade = topic.gradeLevel.some(grade => gradeLevels.includes(grade));
        if (!hasMatchingGrade) return false;
      }

      // Framework filter
      if (frameworks.length > 0) {
        const hasMatchingFramework = topic.standards.some(std => 
          frameworks.includes(std.framework)
        );
        if (!hasMatchingFramework) return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = topic.name.toLowerCase().includes(query);
        const matchesDescription = topic.description.toLowerCase().includes(query);
        const matchesStandard = topic.standards.some(std => 
          std.code.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesDescription && !matchesStandard) {
          return false;
        }
      }

      return true;
    });
  }, [topics, subjects, gradeLevels, frameworks, searchQuery]);

  const progressMap = useMemo(() => {
    const map = new Map<string, number>();
    userProgress.forEach(p => map.set(p.topicId, p.masteryLevel));
    return map;
  }, [userProgress]);

  return (
    <div className="flex gap-8">
      {/* Sidebar Filters */}
      <aside className="w-64 flex-shrink-0">
        <div className="sticky top-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">Filters</h2>
          <CurriculumFilters
            subjects={subjects}
            gradeLevels={gradeLevels}
            frameworks={frameworks}
            searchQuery={searchQuery}
            onSubjectsChange={setSubjects}
            onGradeLevelsChange={setGradeLevels}
            onFrameworksChange={setFrameworks}
            onSearchChange={setSearchQuery}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-900">Curriculum Library</h1>
          <p className="mt-2 text-neutral-600">
            Browse topics and begin your learning journey
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Showing {filteredTopics.length} of {topics.length} topics
          </p>
        </div>

        {filteredTopics.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
            <p className="text-lg text-neutral-600">No topics found</p>
            <p className="mt-2 text-sm text-neutral-500">
              Try adjusting your filters or search query
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTopics.map((topic) => {
              const masteryLevel = progressMap.get(topic.id);
              const userProgressData = masteryLevel !== undefined 
                ? { masteryLevel } 
                : null;

              return (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  userProgress={userProgressData}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
