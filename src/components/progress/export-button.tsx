'use client';

import { useRef } from 'react';

interface ExportRow {
  standard: string;
  subject: string;
  masteryLevel: number;
  assessmentCount: number;
}

interface ExportButtonProps {
  rows?: ExportRow[];
}

export function ExportButton({ rows = [] }: ExportButtonProps) {
  const printTriggered = useRef(false);

  function handlePrint() {
    if (printTriggered.current) return;
    printTriggered.current = true;
    window.print();
    setTimeout(() => { printTriggered.current = false; }, 1000);
  }

  function handleCsvExport() {
    if (!rows.length) return;
    const header = ['Standard', 'Subject', 'Mastery Level', 'Assessment Count'];
    const csvRows = rows.map((row) => [
      row.standard,
      row.subject,
      `${row.masteryLevel}`,
      `${row.assessmentCount}`,
    ]);
    const csv = [header, ...csvRows]
      .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progress-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-center gap-2 print:hidden">
      <button
        onClick={handleCsvExport}
        disabled={!rows.length}
        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Export CSV
      </button>
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect width="12" height="8" x="6" y="14" />
        </svg>
        Print Report
      </button>
    </div>
  );
}
