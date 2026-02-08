'use client';

import { FormEvent, useMemo, useState } from 'react';
import { accommodationCatalog, SupportTier } from '@/app/educator/mock-data';
import { useEducatorPortalStore } from '@/app/educator/portal-store';

export default function EducatorStudentsPage() {
  const students = useEducatorPortalStore((state) => state.students);
  const addStudent = useEducatorPortalStore((state) => state.addStudent);
  const setStudentTier = useEducatorPortalStore((state) => state.setStudentTier);
  const toggleStudentAccommodation = useEducatorPortalStore((state) => state.toggleStudentAccommodation);

  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<SupportTier | 'All'>('All');
  const [selectedId, setSelectedId] = useState(students[0]?.id ?? '');

  const selectedStudent = students.find((student) => student.id === selectedId) ?? null;

  const visibleStudents = useMemo(
    () =>
      students.filter((student) => {
        const matchesName = student.name.toLowerCase().includes(query.toLowerCase());
        const matchesTier = tierFilter === 'All' || student.supportTier === tierFilter;
        return matchesName && matchesTier;
      }),
    [query, students, tierFilter],
  );

  const iepCount = students.filter((student) => student.iep).length;

  const handleAddStudent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const id = addStudent({
      firstName: String(formData.get('firstName') ?? ''),
      lastName: String(formData.get('lastName') ?? ''),
      grade: String(formData.get('grade') ?? 'Grade 4'),
      supportTier: String(formData.get('supportTier') ?? 'Tier 1') as SupportTier,
    });

    if (!id) return;
    setSelectedId(id);
    event.currentTarget.reset();
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <section>
        <h1 className="text-3xl font-bold text-neutral-900">Student roster management</h1>
        <p className="mt-2 text-neutral-700">Track enrollment, support tiers, attendance, and IEP accommodations from one workspace.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-primary-50 px-4 py-2 text-primary-700">Total students: {students.length}</span>
          <span className="rounded-full bg-secondary-50 px-4 py-2 text-secondary-700">Students with IEPs: {iepCount}</span>
          <span className="rounded-full bg-primary-50 px-4 py-2 text-primary-700">
            Avg attendance: {Math.round(students.reduce((sum, s) => sum + s.attendance, 0) / (students.length || 1))}%
          </span>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by student name"
              className="min-w-[220px] flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <select
              value={tierFilter}
              onChange={(event) => setTierFilter(event.target.value as SupportTier | 'All')}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="All">All support tiers</option>
              <option value="Tier 1">Tier 1</option>
              <option value="Tier 2">Tier 2</option>
              <option value="Tier 3">Tier 3</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-neutral-500">
                <tr>
                  <th className="pb-2">Student</th>
                  <th className="pb-2">Grade</th>
                  <th className="pb-2">Support tier</th>
                  <th className="pb-2">Classes</th>
                  <th className="pb-2">IEP</th>
                  <th className="pb-2">Progress</th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student) => (
                  <tr
                    key={student.id}
                    className={`cursor-pointer border-t border-neutral-100 ${selectedId === student.id ? 'bg-primary-50/60' : ''}`}
                    onClick={() => setSelectedId(student.id)}
                  >
                    <td className="py-3 font-medium text-neutral-800">{student.name}</td>
                    <td className="py-3 text-neutral-700">{student.grade}</td>
                    <td className="py-3 text-neutral-700">{student.supportTier}</td>
                    <td className="py-3 text-neutral-700">{student.classIds.length}</td>
                    <td className="py-3 text-neutral-700">{student.iep ? 'Yes' : 'No'}</td>
                    <td className="py-3 text-neutral-700">{student.progress}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <form onSubmit={handleAddStudent} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Add student</h2>
            <div className="mt-3 space-y-2 text-sm">
              <input name="firstName" placeholder="First name" className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
              <input name="lastName" placeholder="Last name" className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
              <select name="grade" className="w-full rounded-lg border border-neutral-300 px-3 py-2">
                <option>Grade 4</option>
                <option>Grade 5</option>
                <option>Grade 6</option>
              </select>
              <select name="supportTier" className="w-full rounded-lg border border-neutral-300 px-3 py-2">
                <option>Tier 1</option>
                <option>Tier 2</option>
                <option>Tier 3</option>
              </select>
            </div>
            <button type="submit" className="mt-3 w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white">
              Create roster entry
            </button>
          </form>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">IEP accommodation management</h2>
            {!selectedStudent ? (
              <p className="mt-2 text-sm text-neutral-600">Select a student to assign accommodations.</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-neutral-600">{selectedStudent.name}</p>
                <label className="mt-3 block text-sm text-neutral-700">
                  Support tier
                  <select
                    value={selectedStudent.supportTier}
                    onChange={(event) => setStudentTier(selectedStudent.id, event.target.value as SupportTier)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2"
                  >
                    <option value="Tier 1">Tier 1</option>
                    <option value="Tier 2">Tier 2</option>
                    <option value="Tier 3">Tier 3</option>
                  </select>
                </label>
                <div className="mt-3 space-y-2 text-sm">
                  {accommodationCatalog.map((accommodation) => {
                    const checked = selectedStudent.accommodations.includes(accommodation);
                    return (
                      <label key={accommodation} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStudentAccommodation(selectedStudent.id, accommodation)}
                          className="h-4 w-4"
                        />
                        {accommodation}
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
