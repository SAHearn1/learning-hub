'use client';

import { useMemo, useState } from 'react';
import { useEducatorPortalStore } from '@/app/educator/portal-store';

export default function EducatorCompliancePage() {
  const compliance = useEducatorPortalStore((state) => state.compliance);
  const students = useEducatorPortalStore((state) => state.students);
  const updateComplianceStatus = useEducatorPortalStore((state) => state.updateComplianceStatus);

  const [statusFilter, setStatusFilter] = useState<'All' | 'On Track' | 'At Risk' | 'Overdue'>('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const records = useMemo(
    () =>
      compliance.filter((record) => {
        const statusMatch = statusFilter === 'All' || record.status === statusFilter;
        const categoryMatch = categoryFilter === 'All' || record.category === categoryFilter;
        return statusMatch && categoryMatch;
      }),
    [categoryFilter, compliance, statusFilter],
  );

  const overdue = compliance.filter((record) => record.status === 'Overdue').length;
  const iepStudents = students.filter((student) => student.iep).length;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <section>
        <h1 className="text-3xl font-bold text-neutral-900">Compliance reporting</h1>
        <p className="mt-2 text-neutral-700">Monitor deadlines, ownership, and completion metrics for IEP and regulatory workflows.</p>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-xs uppercase text-red-700">Overdue items</p>
            <p className="mt-1 text-2xl font-bold text-red-900">{overdue}</p>
          </div>
          <div className="rounded-lg bg-violet-50 p-4">
            <p className="text-xs uppercase text-violet-700">Students with IEPs</p>
            <p className="mt-1 text-2xl font-bold text-violet-900">{iepStudents}</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-800">Use filters and status updates to prep for audits and service reviews.</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'All' | 'On Track' | 'At Risk' | 'Overdue')}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="All">All statuses</option>
            <option value="On Track">On Track</option>
            <option value="At Risk">At Risk</option>
            <option value="Overdue">Overdue</option>
          </select>

          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm">
            <option value="All">All categories</option>
            {Array.from(new Set(compliance.map((record) => record.category))).map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        <div className="mt-5 space-y-3">
          {records.map((record) => (
            <article key={record.id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500">{record.category}</p>
                  <h2 className="mt-1 font-semibold text-neutral-900">{record.requirement}</h2>
                  <p className="mt-1 text-sm text-neutral-600">Owner: {record.owner}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-neutral-800">Due {record.dueDate}</p>
                  <select
                    value={record.status}
                    onChange={(event) => updateComplianceStatus(record.id, event.target.value as 'On Track' | 'At Risk' | 'Overdue')}
                    className="mt-1 rounded-md border border-neutral-300 px-2 py-1"
                  >
                    <option value="On Track">On Track</option>
                    <option value="At Risk">At Risk</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <div className="h-2 rounded-full bg-neutral-100">
                  <div className="h-2 rounded-full bg-neutral-800" style={{ width: `${record.completion}%` }} />
                </div>
                <p className="mt-1 text-xs text-neutral-500">Completion: {record.completion}%</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
