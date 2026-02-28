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

export type IepAccommodation = {
  id: string;
  type: AccommodationType;
  description: string;
  active: boolean;
  startDate: string;
  endDate: string | null;
};

export type StudentRow = {
  id: string;
  gradeLevel: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  iepAccommodations: IepAccommodation[];
  _count: {
    sessions: number;
    progress: number;
  };
  enrollmentCount: number;
};

const ACCOMMODATION_LABELS: Record<AccommodationType, string> = {
  EXTENDED_TIME: 'Extended time',
  REDUCED_STIMULI: 'Reduced-distraction setting',
  SIMPLIFIED_MODE: 'Simplified mode',
  TEXT_TO_SPEECH: 'Text-to-speech support',
  FREQUENT_BREAKS: 'Frequent check-ins',
  CHUNKED_CONTENT: 'Chunked assignments',
  MODIFIED_DIFFICULTY: 'Modified difficulty',
  VISUAL_SUPPORTS: 'Visual supports',
  AUDIO_SUPPORTS: 'Audio supports',
  ALTERNATIVE_ASSESSMENT: 'Alternative assessment',
};

type Props = {
  students: StudentRow[];
};

export function StudentsClient({ students }: Props) {
  const [query, setQuery] = useState('');
  const [iepFilter, setIepFilter] = useState<'All' | 'IEP' | 'No IEP'>('All');
  const [selectedId, setSelectedId] = useState(students[0]?.id ?? '');

  const selectedStudent = students.find((s) => s.id === selectedId) ?? null;

  const visibleStudents = useMemo(
    () =>
      students.filter((student) => {
        const fullName = `${student.user.firstName} ${student.user.lastName}`.toLowerCase();
        const matchesName = fullName.includes(query.toLowerCase());
        const hasIep = student.iepAccommodations.length > 0;
        const matchesIep =
          iepFilter === 'All' ||
          (iepFilter === 'IEP' && hasIep) ||
          (iepFilter === 'No IEP' && !hasIep);
        return matchesName && matchesIep;
      }),
    [query, students, iepFilter],
  );

  const iepCount = students.filter((s) => s.iepAccommodations.length > 0).length;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <section>
        <h1 className="text-3xl font-bold text-neutral-900">Student roster management</h1>
        <p className="mt-2 text-neutral-700">
          Track enrollment, support tiers, attendance, and IEP accommodations from one workspace.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-blue-50 px-4 py-2 text-blue-700">
            Total students: {students.length}
          </span>
          <span className="rounded-full bg-violet-50 px-4 py-2 text-violet-700">
            Students with IEPs: {iepCount}
          </span>
          <span className="rounded-full bg-emerald-50 px-4 py-2 text-emerald-700">
            Total sessions: {students.reduce((sum, s) => sum + s._count.sessions, 0)}
          </span>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by student name"
              className="min-w-[220px] flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <select
              value={iepFilter}
              onChange={(e) => setIepFilter(e.target.value as 'All' | 'IEP' | 'No IEP')}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="All">All students</option>
              <option value="IEP">Has IEP</option>
              <option value="No IEP">No IEP</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-neutral-500">
                <tr>
                  <th className="pb-2">Student</th>
                  <th className="pb-2">Grade</th>
                  <th className="pb-2">Classes</th>
                  <th className="pb-2">IEP</th>
                  <th className="pb-2">Sessions</th>
                  <th className="pb-2">Standards</th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student) => (
                  <tr
                    key={student.id}
                    className={`cursor-pointer border-t border-neutral-100 ${
                      selectedId === student.id ? 'bg-blue-50/60' : ''
                    }`}
                    onClick={() => setSelectedId(student.id)}
                  >
                    <td className="py-3 font-medium text-neutral-800">
                      {student.user.firstName} {student.user.lastName}
                    </td>
                    <td className="py-3 text-neutral-700">Grade {student.gradeLevel}</td>
                    <td className="py-3 text-neutral-700">{student.enrollmentCount}</td>
                    <td className="py-3 text-neutral-700">
                      {student.iepAccommodations.length > 0 ? 'Yes' : 'No'}
                    </td>
                    <td className="py-3 text-neutral-700">{student._count.sessions}</td>
                    <td className="py-3 text-neutral-700">{student._count.progress}</td>
                  </tr>
                ))}
                {visibleStudents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-neutral-500">
                      No students match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">IEP accommodation details</h2>
            {!selectedStudent ? (
              <p className="mt-2 text-sm text-neutral-600">Select a student to view accommodations.</p>
            ) : (
              <>
                <p className="mt-2 text-sm font-medium text-neutral-700">
                  {selectedStudent.user.firstName} {selectedStudent.user.lastName}
                </p>
                <p className="text-sm text-neutral-500">{selectedStudent.user.email}</p>

                {selectedStudent.iepAccommodations.length === 0 ? (
                  <p className="mt-3 text-sm text-neutral-600">No active IEP accommodations.</p>
                ) : (
                  <div className="mt-3 space-y-2 text-sm">
                    {selectedStudent.iepAccommodations.map((acc) => (
                      <div
                        key={acc.id}
                        className="rounded-lg border border-neutral-200 px-3 py-2"
                      >
                        <p className="font-medium text-neutral-800">
                          {ACCOMMODATION_LABELS[acc.type] ?? acc.type}
                        </p>
                        <p className="mt-0.5 text-neutral-600">{acc.description}</p>
                        <p className="mt-0.5 text-xs text-neutral-400">
                          Since {new Date(acc.startDate).toLocaleDateString()}
                          {acc.endDate && ` · Ends ${new Date(acc.endDate).toLocaleDateString()}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                  <p>
                    <span className="font-medium">Grade level:</span> {selectedStudent.gradeLevel}
                  </p>
                  <p className="mt-1">
                    <span className="font-medium">Sessions completed:</span>{' '}
                    {selectedStudent._count.sessions}
                  </p>
                  <p className="mt-1">
                    <span className="font-medium">Standards tracked:</span>{' '}
                    {selectedStudent._count.progress}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
