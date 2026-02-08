'use client';

import { Subject, StandardFramework } from '@prisma/client';
import { Search } from 'lucide-react';

interface CurriculumFiltersProps {
  subjects: Subject[];
  gradeLevels: number[];
  frameworks: StandardFramework[];
  searchQuery: string;
  onSubjectsChange: (subjects: Subject[]) => void;
  onGradeLevelsChange: (grades: number[]) => void;
  onFrameworksChange: (frameworks: StandardFramework[]) => void;
  onSearchChange: (query: string) => void;
}

const SUBJECT_LABELS = {
  MATH: 'Math',
  SCIENCE: 'Science',
  LANGUAGE_ARTS: 'Language Arts',
} as const;

const FRAMEWORK_LABELS = {
  GEORGIA: 'Georgia Standards',
  COMMON_CORE: 'Common Core',
  NGSS: 'NGSS',
} as const;

export function CurriculumFilters({
  subjects,
  gradeLevels,
  frameworks,
  searchQuery,
  onSubjectsChange,
  onGradeLevelsChange,
  onFrameworksChange,
  onSearchChange,
}: CurriculumFiltersProps) {
  const toggleSubject = (subject: Subject) => {
    if (subjects.includes(subject)) {
      onSubjectsChange(subjects.filter(s => s !== subject));
    } else {
      onSubjectsChange([...subjects, subject]);
    }
  };

  const toggleGrade = (grade: number) => {
    if (gradeLevels.includes(grade)) {
      onGradeLevelsChange(gradeLevels.filter(g => g !== grade));
    } else {
      onGradeLevelsChange([...gradeLevels, grade]);
    }
  };

  const toggleFramework = (framework: StandardFramework) => {
    if (frameworks.includes(framework)) {
      onFrameworksChange(frameworks.filter(f => f !== framework));
    } else {
      onFrameworksChange([...frameworks, framework]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label htmlFor="search" className="block text-sm font-medium text-neutral-700 mb-2">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            id="search"
            type="text"
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 py-2 pl-10 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Subject Filter */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Subject
        </label>
        <div className="space-y-2">
          {Object.entries(SUBJECT_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={subjects.includes(value as Subject)}
                onChange={() => toggleSubject(value as Subject)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-neutral-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Grade Level Filter */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Grade Level
        </label>
        <div className="space-y-2">
          {[6, 7, 8].map((grade) => (
            <label key={grade} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={gradeLevels.includes(grade)}
                onChange={() => toggleGrade(grade)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-neutral-700">Grade {grade}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Framework Filter */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Standards Framework
        </label>
        <div className="space-y-2">
          {Object.entries(FRAMEWORK_LABELS).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={frameworks.includes(value as StandardFramework)}
                onChange={() => toggleFramework(value as StandardFramework)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-neutral-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {(subjects.length > 0 || gradeLevels.length > 0 || frameworks.length > 0 || searchQuery) && (
        <button
          onClick={() => {
            onSubjectsChange([]);
            onGradeLevelsChange([]);
            onFrameworksChange([]);
            onSearchChange('');
          }}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
