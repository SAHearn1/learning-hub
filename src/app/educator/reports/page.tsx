'use client';

import { useMemo, useState } from 'react';
import { useEducatorPortalStore } from '@/app/educator/portal-store';

export default function EducatorReportsPage() {
  const classes = useEducatorPortalStore((state) => state.classes);
  const students = useEducatorPortalStore((state) => state.students);
  const progress = useEducatorPortalStore((state) => state.progress);

  const [classFilter, setClassFilter] = useState('All');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState<'All' | 'At Risk' | 'On Track'>('All');
  const [tierFilter, setTierFilter] = useState<'All' | 'Tier 1' | 'Tier 2' | 'Tier 3'>('All');

  const studentsById = useMemo(() => Object.fromEntries(students.map((student) => [student.id, student])), [students]);
  const classesById = useMemo(() => Object.fromEntries(classes.map((item) => [item.id, item])), [classes]);

  const filteredReports = useMemo(
    () =>
      progress.filter((record) => {
        const classMatch = classFilter === 'All' || record.classId === classFilter;
        const subjectMatch = subjectFilter === 'All' || record.subject === subjectFilter;
        const riskStatus = record.mastery < 70 || record.missingAssignments > 1 ? 'At Risk' : 'On Track';
        const riskMatch = riskFilter === 'All' || riskFilter === riskStatus;
        const tier = studentsById[record.studentId]?.supportTier;
        const tierMatch = tierFilter === 'All' || tier === tierFilter;
        return classMatch && subjectMatch && riskMatch && tierMatch;
      }),
    [classFilter, progress, riskFilter, studentsById, subjectFilter, tierFilter],
  );

  const avgMastery = Math.round(filteredReports.reduce((sum, report) => sum + report.mastery, 0) / (filteredReports.length || 1));

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <section>
        <h1 className="text-3xl font-bold text-neutral-900">Progress reports with filtering</h1>
        <p className="mt-2 text-neutral-700">Review learner growth, mastery, and assignment risk indicators across classes.</p>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-4">
          <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
            <option value="All">All classes</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>

          <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
            <option value="All">All subjects</option>
            {Array.from(new Set(classes.map((item) => item.subject))).map((subject) => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>

          <select
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value as 'All' | 'At Risk' | 'On Track')}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="All">All risk levels</option>
            <option value="On Track">On Track</option>
            <option value="At Risk">At Risk</option>
          </select>

          <select value={tierFilter} onChange={(event) => setTierFilter(event.target.value as 'All' | 'Tier 1' | 'Tier 2' | 'Tier 3')} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
            <option value="All">All support tiers</option>
            <option value="Tier 1">Tier 1</option>
            <option value="Tier 2">Tier 2</option>
            <option value="Tier 3">Tier 3</option>
          </select>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-primary-50 p-4">
            <p className="text-xs uppercase text-primary-700">Visible reports</p>
            <p className="mt-1 text-2xl font-bold text-primary-900">{filteredReports.length}</p>
          </div>
          <div className="rounded-lg bg-neutral-100 p-4">
            <p className="text-xs uppercase text-neutral-700">Average mastery</p>
            <p className="mt-1 text-2xl font-bold text-neutral-900">{avgMastery}%</p>
          </div>
          <div className="rounded-lg bg-secondary-50 p-4">
            <p className="text-xs uppercase text-secondary-700">At-risk learners</p>
            <p className="mt-1 text-2xl font-bold text-secondary-900">
              {filteredReports.filter((item) => item.mastery < 70 || item.missingAssignments > 1).length}
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="pb-2">Student</th>
                <th className="pb-2">Tier</th>
                <th className="pb-2">Class</th>
                <th className="pb-2">Growth</th>
                <th className="pb-2">Mastery</th>
                <th className="pb-2">Missing assignments</th>
                <th className="pb-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={`${report.studentId}-${report.classId}`} className="border-t border-neutral-100">
                  <td className="py-3 font-medium text-neutral-800">{studentsById[report.studentId]?.name}</td>
                  <td className="py-3 text-neutral-700">{studentsById[report.studentId]?.supportTier}</td>
                  <td className="py-3 text-neutral-700">{classesById[report.classId]?.name}</td>
                  <td className="py-3 text-neutral-700">+{report.growth}%</td>
                  <td className="py-3 text-neutral-700">{report.mastery}%</td>
                  <td className="py-3 text-neutral-700">{report.missingAssignments}</td>
                  <td className="py-3 text-neutral-700">{report.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
