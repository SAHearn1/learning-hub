'use client';

import { FormEvent, useState } from 'react';

export type ClassRow = {
  id: string;
  name: string;
  subject: string;
  gradeLevel: number;
  academicYear: string;
  school: { name: string } | null;
  _count: { enrollments: number };
};

export type StudentOption = {
  id: string;
  firstName: string;
  lastName: string;
};

type Props = {
  classes: ClassRow[];
  students: StudentOption[];
  schools: { id: string; name: string }[];
};

const SUBJECTS = [
  { value: 'MATH', label: 'Math' },
  { value: 'SCIENCE', label: 'Science' },
  { value: 'LANGUAGE_ARTS', label: 'Language Arts (ELA)' },
  { value: 'FINANCIAL_LITERACY', label: 'Financial Literacy' },
] as const;

export function ClassesClient({ classes: initialClasses, students, schools }: Props) {
  const [classes, setClasses] = useState(initialClasses);
  const [selectedClassId, setSelectedClassId] = useState(initialClasses[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const selectedClass = classes.find((c) => c.id === selectedClassId) ?? null;

  const handleCreateClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const name = String(formData.get('name') ?? '').trim();
    const subject = String(formData.get('subject') ?? '');
    const gradeLevel = parseInt(String(formData.get('gradeLevel') ?? '6'), 10);
    const academicYear = String(formData.get('academicYear') ?? '').trim();
    const schoolId = String(formData.get('schoolId') ?? '').trim();

    if (!name || !subject || !academicYear || !schoolId) {
      setMessage('Please fill in all required fields.');
      return;
    }

    setCreating(true);
    setMessage('');

    try {
      const res = await fetch('/api/educator/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, gradeLevel, academicYear, schoolId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage((err as { message?: string }).message ?? 'Failed to create class.');
        return;
      }

      const { data } = (await res.json()) as { data: { id: string; name: string; subject: string; gradeLevel: number; academicYear: string } };

      setClasses((prev) => [
        {
          id: data.id,
          name: data.name,
          subject: data.subject,
          gradeLevel: data.gradeLevel,
          academicYear: data.academicYear,
          school: schools.find((s) => s.id === schoolId) ?? null,
          _count: { enrollments: 0 },
        },
        ...prev,
      ]);
      setSelectedClassId(data.id);
      setMessage('Class created successfully.');
      (event.target as HTMLFormElement).reset();
    } catch {
      setMessage('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleEnroll = async (studentId: string) => {
    if (!selectedClassId) return;
    setEnrolling(true);
    setMessage('');

    try {
      const res = await fetch(`/api/educator/classes/${selectedClassId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage((err as { message?: string }).message ?? 'Failed to update enrollment.');
        return;
      }

      setClasses((prev) =>
        prev.map((c) =>
          c.id === selectedClassId
            ? { ...c, _count: { enrollments: c._count.enrollments + 1 } }
            : c,
        ),
      );
      setMessage('Student enrolled successfully.');
    } catch {
      setMessage('Network error. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <section>
        <h1 className="text-3xl font-bold text-neutral-900">Class creation and enrollment</h1>
        <p className="mt-2 text-neutral-700">
          Create classes, monitor capacity, and enroll students into active sections.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Active classes</h2>
            {classes.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-600">No classes yet. Create one to get started.</p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {classes.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedClassId(item.id)}
                    className={`rounded-lg border p-4 text-left ${
                      selectedClassId === item.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-neutral-200'
                    }`}
                  >
                    <p className="font-semibold text-neutral-900">{item.name}</p>
                    <p className="mt-1 text-sm text-neutral-600">
                      {SUBJECTS.find((s) => s.value === item.subject)?.label ?? item.subject} ·{' '}
                      Grade {item.gradeLevel}
                    </p>
                    {item.school && (
                      <p className="mt-0.5 text-xs text-neutral-500">{item.school.name}</p>
                    )}
                    <p className="mt-2 text-sm text-neutral-700">
                      Enrolled: {item._count.enrollments}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Enroll students</h2>
            {!selectedClass ? (
              <p className="mt-3 text-sm text-neutral-600">Select a class first.</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-neutral-600">
                  {selectedClass.name} · Grade {selectedClass.gradeLevel}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => handleEnroll(student.id)}
                      disabled={enrolling}
                      className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50 disabled:opacity-50"
                    >
                      <span className="text-blue-600">+</span>
                      <span>
                        {student.firstName} {student.lastName}
                      </span>
                    </button>
                  ))}
                  {students.length === 0 && (
                    <p className="col-span-2 text-sm text-neutral-500">No students available.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <form onSubmit={handleCreateClass} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">Create class</h2>
          <div className="mt-3 space-y-2 text-sm">
            <input
              name="name"
              placeholder="Class name"
              required
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
            <select name="subject" className="w-full rounded-lg border border-neutral-300 px-3 py-2">
              {SUBJECTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select name="gradeLevel" className="w-full rounded-lg border border-neutral-300 px-3 py-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
            <input
              name="academicYear"
              placeholder="Academic year (e.g. 2025-2026)"
              required
              defaultValue="2025-2026"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
            {schools.length > 0 ? (
              <select
                name="schoolId"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              >
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                No schools found in your tenant. A school must be created before classes can be
                added.
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={creating || schools.length === 0}
            className="mt-3 w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Add class section'}
          </button>
          {message && <p className="mt-3 text-sm text-neutral-700">{message}</p>}

          {selectedClass && (
            <div className="mt-5 rounded-lg bg-neutral-50 p-3 text-sm">
              <p className="font-medium text-neutral-800">Selected class</p>
              <p className="mt-1 text-neutral-700">{selectedClass.name}</p>
              <p className="text-neutral-500">
                {SUBJECTS.find((s) => s.value === selectedClass.subject)?.label ?? selectedClass.subject}{' '}
                · Grade {selectedClass.gradeLevel}
              </p>
              <p className="mt-1 text-neutral-600">
                {selectedClass._count.enrollments} enrolled
              </p>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
