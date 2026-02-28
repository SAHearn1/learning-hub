'use client';

import { useMemo, useState } from 'react';

export type AccommodationType =
  | 'EXTENDED_TIME'
  | 'REDUCED_STIMULI'
  | 'SIMPLIFIED_MODE'
  | 'TEXT_TO_SPEECH'
  | 'FREQUENT_BREAKS'
  | 'CHUNKED_CONTENT'
  | 'MODIFIED_DIFFICULTY'
  | 'VISUAL_SUPPORTS'
  | 'AUDIO_SUPPORTS'
  | 'ALTERNATIVE_ASSESSMENT';

export type ComplianceStudent = {
  id: string;
  gradeLevel: number;
  user: {
    firstName: string;
    lastName: string;
  };
  iepAccommodations: {
    id: string;
    type: AccommodationType;
    description: string;
    active: boolean;
    startDate: string;
    endDate: string | null;
  }[];
};

type Props = {
  students: ComplianceStudent[];
  totalStudentCount: number;
};

const ACCOMMODATION_LABELS: Record<AccommodationType, string> = {
  EXTENDED_TIME: 'Extended time',
  REDUCED_STIMULI: 'Reduced-distraction setting',
  SIMPLIFIED_MODE: 'Simplified mode',
  TEXT_TO_SPEECH: 'Text-to-speech support',
  FREQUENT_BREAKS: 'Frequent check-ins / breaks',
  CHUNKED_CONTENT: 'Chunked assignments',
  MODIFIED_DIFFICULTY: 'Modified difficulty',
  VISUAL_SUPPORTS: 'Visual supports',
  AUDIO_SUPPORTS: 'Audio supports',
  ALTERNATIVE_ASSESSMENT: 'Alternative assessment',
};

export function ComplianceClient({ students, totalStudentCount }: Props) {
  const [typeFilter, setTypeFilter] = useState('All');
  const [query, setQuery] = useState('');

  const allTypes = useMemo(() => {
    const types = new Set<string>();
    students.forEach((s) => s.iepAccommodations.forEach((acc) => types.add(acc.type)));
    return Array.from(types).sort();
  }, [students]);

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const fullName = `${student.user.firstName} ${student.user.lastName}`.toLowerCase();
        const nameMatch = fullName.includes(query.toLowerCase());
        const typeMatch =
          typeFilter === 'All' ||
          student.iepAccommodations.some((acc) => acc.type === typeFilter);
        return nameMatch && typeMatch;
      }),
    [query, students, typeFilter],
  );

  const totalAccommodations = students.reduce((sum, s) => sum + s.iepAccommodations.length, 0);
  const expiringSoon = students
    .flatMap((s) => s.iepAccommodations)
    .filter((acc) => {
      if (!acc.endDate) return false;
      const end = new Date(acc.endDate);
      const now = new Date();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      return end.getTime() - now.getTime() < thirtyDays && end > now;
    }).length;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <section>
        <h1 className="text-3xl font-bold text-neutral-900">Compliance reporting</h1>
        <p className="mt-2 text-neutral-700">
          Monitor IEP accommodations and compliance status for students in your tenant.
        </p>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-violet-50 p-4">
            <p className="text-xs uppercase text-violet-700">Students with IEPs</p>
            <p className="mt-1 text-2xl font-bold text-violet-900">{students.length}</p>
            <p className="mt-0.5 text-xs text-violet-600">of {totalStudentCount} total students</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-xs uppercase text-blue-700">Active accommodations</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{totalAccommodations}</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4">
            <p className="text-xs uppercase text-amber-700">Expiring within 30 days</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{expiringSoon}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by student name"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="All">All accommodation types</option>
            {allTypes.map((type) => (
              <option key={type} value={type}>
                {ACCOMMODATION_LABELS[type as AccommodationType] ?? type}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 space-y-3">
          {filteredStudents.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-500">
              No students match your search.
            </p>
          ) : (
            filteredStudents.map((student) => (
              <article key={student.id} className="rounded-lg border border-neutral-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-neutral-900">
                      {student.user.firstName} {student.user.lastName}
                    </h2>
                    <p className="mt-0.5 text-sm text-neutral-500">Grade {student.gradeLevel}</p>
                  </div>
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                    {student.iepAccommodations.length} accommodation
                    {student.iepAccommodations.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {student.iepAccommodations.map((acc) => {
                    const isExpiringSoon =
                      acc.endDate &&
                      new Date(acc.endDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 &&
                      new Date(acc.endDate) > new Date();

                    return (
                      <div
                        key={acc.id}
                        className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-neutral-800">
                          {ACCOMMODATION_LABELS[acc.type] ?? acc.type}
                        </p>
                        <p className="mt-0.5 text-neutral-600">{acc.description}</p>
                        <p className="mt-1 text-xs text-neutral-400">
                          Since {new Date(acc.startDate).toLocaleDateString()}
                          {acc.endDate && (
                            <span
                              className={
                                isExpiringSoon ? 'ml-1 font-medium text-amber-600' : ''
                              }
                            >
                              {' '}
                              · Ends {new Date(acc.endDate).toLocaleDateString()}
                              {isExpiringSoon && ' (expiring soon)'}
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
