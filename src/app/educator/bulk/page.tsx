'use client';

import { useState } from 'react';

export default function BulkOperationsPage() {
  const [tab, setTab] = useState<'grades' | 'notices'>('grades');
  const [gradesJson, setGradesJson] = useState('');
  const [noticeStudentIds, setNoticeStudentIds] = useState('');
  const [trigger, setTrigger] = useState('ANNUAL_NOTICE');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBulkGrades = async () => {
    setLoading(true);
    setResult(null);
    try {
      const grades = JSON.parse(gradesJson);
      const res = await fetch('/api/bulk/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades }),
      });
      const json = await res.json();
      setResult(`Graded ${json.data?.length ?? 0} submissions.`);
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Invalid input'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkNotices = async () => {
    setLoading(true);
    setResult(null);
    try {
      const studentIds = noticeStudentIds.split('\n').map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/bulk/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds, trigger }),
      });
      const json = await res.json();
      const successes = json.data?.filter((r: { success: boolean }) => r.success).length ?? 0;
      setResult(`Issued notices to ${successes}/${studentIds.length} students.`);
    } catch (err) {
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <h1 className="text-3xl font-bold text-[#0C3B2E]">Bulk Operations</h1>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('grades')}
          className={`rounded-md px-4 py-2 text-sm font-medium ${tab === 'grades' ? 'bg-[#0C3B2E] text-white' : 'bg-neutral-100'}`}
        >
          Bulk Grades
        </button>
        <button
          onClick={() => setTab('notices')}
          className={`rounded-md px-4 py-2 text-sm font-medium ${tab === 'notices' ? 'bg-[#0C3B2E] text-white' : 'bg-neutral-100'}`}
        >
          Bulk Notices
        </button>
      </div>

      {tab === 'grades' && (
        <div className="space-y-3 rounded-lg border bg-white p-5">
          <label className="block text-sm font-medium">
            Grades JSON (array of {`{ submissionId, score, maxScore, feedback? }`})
          </label>
          <textarea
            value={gradesJson}
            onChange={(e) => setGradesJson(e.target.value)}
            rows={8}
            className="w-full rounded-md border px-3 py-2 text-sm font-mono"
            placeholder='[{"submissionId":"...","score":85,"maxScore":100}]'
          />
          <button onClick={handleBulkGrades} disabled={loading}
            className="rounded-md bg-[#0C3B2E] px-4 py-2 text-sm text-white disabled:opacity-50">
            {loading ? 'Processing...' : 'Submit Bulk Grades'}
          </button>
        </div>
      )}

      {tab === 'notices' && (
        <div className="space-y-3 rounded-lg border bg-white p-5">
          <label className="block text-sm font-medium">Student IDs (one per line)</label>
          <textarea
            value={noticeStudentIds}
            onChange={(e) => setNoticeStudentIds(e.target.value)}
            rows={6}
            className="w-full rounded-md border px-3 py-2 text-sm font-mono"
            placeholder="student-id-1&#10;student-id-2"
          />
          <label className="block text-sm font-medium">Trigger</label>
          <select value={trigger} onChange={(e) => setTrigger(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm">
            <option value="ANNUAL_NOTICE">Annual Notice</option>
            <option value="PARENT_REQUEST">Parent Request</option>
          </select>
          <button onClick={handleBulkNotices} disabled={loading}
            className="rounded-md bg-[#0C3B2E] px-4 py-2 text-sm text-white disabled:opacity-50">
            {loading ? 'Processing...' : 'Issue Bulk Notices'}
          </button>
        </div>
      )}

      {result && (
        <div className="rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">{result}</div>
      )}
    </main>
  );
}
