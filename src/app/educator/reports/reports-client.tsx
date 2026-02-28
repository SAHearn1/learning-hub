'use client';

import { useMemo, useState } from 'react';

export type ReportRow = {
  studentId: string;
  studentName: string;
  gradeLevel: number;
  standardCode: string;
  standardDescription: string;
  subject: string;
  masteryLevel: number;
  assessmentCount: number;
  lastAssessedAt: string | null;
  updatedAt: string;
};

export type ClassOption = {
  id: string;
  name: string;
  subject: string;
};

type Props = {
  reports: ReportRow[];
  classes: ClassOption[];
};

const MASTERY_THRESHOLD = 70;

export function ReportsClient({ reports, classes }: Props) {
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [riskFilter, setRiskFilter] = useState<'All' | 'At Risk' | 'On Track'>('All');

  const subjects = useMemo(
    () => Array.from(new Set(reports.map((r) => r.subject))).sort(),
    [reports],
  );

  const filteredReports = useMemo(
    () =>
      reports.filter((record) => {
        const subjectMatch = subjectFilter === 'All' || record.subject === subjectFilter;
        const riskStatus = record.masteryLevel < MASTERY_THRESHOLD ? 'At Risk' : 'On Track';
        const riskMatch = riskFilter === 'All' || riskFilter === riskStatus;
        return subjectMatch && riskMatch;
      }),
    [reports, riskFilter, subjectFilter],
  );

  const avgMastery =
    filteredReports.length > 0
      ? Math.round(
          filteredReports.reduce((sum, r) => sum + r.masteryLevel, 0) / filteredReports.length,
        )
      : 0;

  const atRiskCount = filteredReports.filter((r) => r.masteryLevel < MASTERY_THRESHOLD).length;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <section>
        <h1 className="text-3xl font-bold text-neutral-900">Progress reports with filtering</h1>
        <p className="mt-2 text-neutral-700">
          Review learner growth, mastery, and standards tracking across your classes.
        </p>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="All">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as 'All' | 'At Risk' | 'On Track')}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="All">All risk levels</option>
            <option value="On Track">On Track</option>
            <option value="At Risk">At Risk</option>
          </select>

          <div className="flex items-center text-sm text-neutral-500">
            {classes.length} class{classes.length !== 1 ? 'es' : ''} · {reports.length} progress
            records
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-xs uppercase text-green-700">Visible records</p>
            <p className="mt-1 text-2xl font-bold text-green-900">{filteredReports.length}</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-xs uppercase text-blue-700">Average mastery</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{avgMastery}%</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4">
            <p className="text-xs uppercase text-amber-700">At-risk learners</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{atRiskCount}</p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-neutral-500">
              <tr>
                <th className="pb-2">Student</th>
                <th className="pb-2">Grade</th>
                <th className="pb-2">Standard</th>
                <th className="pb-2">Subject</th>
                <th className="pb-2">Mastery</th>
                <th className="pb-2">Assessments</th>
                <th className="pb-2">Last assessed</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report, idx) => {
                const atRisk = report.masteryLevel < MASTERY_THRESHOLD;
                return (
                  <tr
                    key={`${report.studentId}-${report.standardCode}-${idx}`}
                    className="border-t border-neutral-100"
                  >
                    <td className="py-3 font-medium text-neutral-800">{report.studentName}</td>
                    <td className="py-3 text-neutral-700">Grade {report.gradeLevel}</td>
                    <td className="py-3 text-neutral-700">
                      <span className="font-mono text-xs">{report.standardCode}</span>
                    </td>
                    <td className="py-3 text-neutral-700">{report.subject}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          atRisk
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {Math.round(report.masteryLevel)}%
                      </span>
                    </td>
                    <td className="py-3 text-neutral-700">{report.assessmentCount}</td>
                    <td className="py-3 text-neutral-700">
                      {report.lastAssessedAt
                        ? new Date(report.lastAssessedAt).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                );
              })}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-neutral-500">
                    No progress records match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
