'use client';

import { FormEvent, useMemo, useState } from 'react';
import { ClassRecord, initialClasses, initialStudents } from '@/app/educator/mock-data';

export default function EducatorClassesPage() {
  const [classes, setClasses] = useState<ClassRecord[]>(initialClasses);
  const [selectedClassId, setSelectedClassId] = useState(initialClasses[0]?.id ?? '');
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<Record<string, string[]>>(
    Object.fromEntries(initialClasses.map((item) => [item.id, item.studentIds])),
  );

  const selectedClass = classes.find((item) => item.id === selectedClassId) ?? null;
  const selectedRoster = selectedClass ? enrolledStudentIds[selectedClass.id] ?? [] : [];

  const studentsById = useMemo(() => Object.fromEntries(initialStudents.map((student) => [student.id, student])), []);

  const createClass = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const name = String(formData.get('name') ?? '');
    const period = String(formData.get('period') ?? '');
    const subject = String(formData.get('subject') ?? 'General');
    const capacity = Number(formData.get('capacity') ?? 20);

    if (!name || !period) return;

    const newClass: ClassRecord = {
      id: `cls-${Date.now()}`,
      name,
      period,
      subject,
      capacity,
      studentIds: [],
    };

    setClasses((prev) => [...prev, newClass]);
    setEnrolledStudentIds((prev) => ({ ...prev, [newClass.id]: [] }));
    setSelectedClassId(newClass.id);
    event.currentTarget.reset();
  };

  const toggleEnrollment = (studentId: string) => {
    if (!selectedClass) return;

    setEnrolledStudentIds((prev) => {
      const current = prev[selectedClass.id] ?? [];
      const next = current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId];
      return { ...prev, [selectedClass.id]: next };
    });
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <section>
        <h1 className="text-3xl font-bold text-neutral-900">Class creation and enrollment</h1>
        <p className="mt-2 text-neutral-700">Create classes, monitor capacity, and enroll students into active sections.</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Active classes</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {classes.map((item) => {
                const count = (enrolledStudentIds[item.id] ?? []).length;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedClassId(item.id)}
                    className={`rounded-lg border p-4 text-left ${selectedClassId === item.id ? 'border-blue-500 bg-blue-50' : 'border-neutral-200'}`}
                  >
                    <p className="font-semibold text-neutral-900">{item.name}</p>
                    <p className="mt-1 text-sm text-neutral-600">{item.subject} · {item.period}</p>
                    <p className="mt-2 text-sm text-neutral-700">Enrollment: {count}/{item.capacity}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-900">Enroll students</h2>
            {!selectedClass ? (
              <p className="mt-3 text-sm text-neutral-600">Select a class first.</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-neutral-600">{selectedClass.name} · {selectedClass.period}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {initialStudents.map((student) => {
                    const checked = selectedRoster.includes(student.id);
                    return (
                      <label key={student.id} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                        <input type="checkbox" checked={checked} onChange={() => toggleEnrollment(student.id)} />
                        <span>{student.name}</span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <form onSubmit={createClass} className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-900">Create class</h2>
          <div className="mt-3 space-y-2 text-sm">
            <input name="name" placeholder="Class name" className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
            <input name="period" placeholder="Period (e.g. 5th Period)" className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
            <select name="subject" className="w-full rounded-lg border border-neutral-300 px-3 py-2">
              <option>ELA</option>
              <option>Math</option>
              <option>Science</option>
              <option>Social Studies</option>
              <option>Intervention</option>
            </select>
            <input
              type="number"
              min={5}
              max={40}
              name="capacity"
              defaultValue={24}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </div>
          <button type="submit" className="mt-3 w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white">
            Add class section
          </button>

          <div className="mt-5 rounded-lg bg-neutral-50 p-3 text-sm">
            <p className="font-medium text-neutral-800">Selected class roster</p>
            <ul className="mt-2 space-y-1 text-neutral-700">
              {selectedRoster.map((studentId) => (
                <li key={studentId}>• {studentsById[studentId]?.name ?? studentId}</li>
              ))}
              {selectedRoster.length === 0 && <li>No students enrolled yet.</li>}
            </ul>
          </div>
        </form>
      </section>
    </main>
  );
}
