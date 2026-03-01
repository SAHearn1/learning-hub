/**
 * Eligibility Report Generator
 *
 * Deterministic HTML + SHA-256 hash per 34 CFR §300.306.
 */

import crypto from 'crypto';
import type { EligibilityOutcome } from '@/types/evaluation';

export type EligibilityReportParams = {
  studentName: string;
  districtName: string;
  outcome: EligibilityOutcome;
  disabilityCategory: string | null;
  rationale: string;
  assessmentSummary: string;
  meetingDate: string;
  attendees: { name: string; role: string }[];
};

export type GeneratedEligibilityReport = {
  content: string;
  docHash: string;
};

const OUTCOME_LABELS: Record<EligibilityOutcome, string> = {
  ELIGIBLE: 'Eligible for Special Education Services',
  NOT_ELIGIBLE: 'Not Eligible for Special Education Services',
  DISMISSED: 'Dismissed from Special Education Services',
};

export function generateEligibilityDocument(
  params: EligibilityReportParams,
): GeneratedEligibilityReport {
  const outcomeLabel = OUTCOME_LABELS[params.outcome];
  const outcomeColor = params.outcome === 'ELIGIBLE' ? '#16a34a' : '#dc2626';

  const attendeesTable = params.attendees
    .map((a) => `<tr><td style="padding: 0.25rem 0.5rem;">${a.name}</td><td style="padding: 0.25rem 0.5rem;">${a.role}</td></tr>`)
    .join('');

  const content = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Eligibility Determination Report</title></head>
<body style="font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 2rem;">
  <header style="border-bottom: 2px solid #1a365d; padding-bottom: 1rem; margin-bottom: 2rem;">
    <h1 style="color: #1a365d; font-size: 1.25rem;">${params.districtName}</h1>
    <p style="color: #4a5568; font-size: 0.875rem;">Meeting Date: ${params.meetingDate}</p>
  </header>

  <h1 style="color: #1a365d;">Eligibility Determination Report</h1>
  <p><strong>Student:</strong> ${params.studentName}</p>

  <h2>Determination</h2>
  <p style="font-size: 1.125rem; font-weight: bold; color: ${outcomeColor};">${outcomeLabel}</p>
  ${params.disabilityCategory ? `<p><strong>Disability Category:</strong> ${params.disabilityCategory}</p>` : ''}

  <h2>Rationale</h2>
  <p>${params.rationale}</p>

  <h2>Assessment Summary</h2>
  <p>${params.assessmentSummary}</p>

  <h2>Meeting Participants</h2>
  <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
    <thead>
      <tr style="background: #f7fafc;">
        <th style="padding: 0.5rem; text-align: left; border-bottom: 1px solid #e2e8f0;">Name</th>
        <th style="padding: 0.5rem; text-align: left; border-bottom: 1px solid #e2e8f0;">Role</th>
      </tr>
    </thead>
    <tbody>${attendeesTable}</tbody>
  </table>

  <footer style="border-top: 1px solid #cbd5e0; padding-top: 1rem; margin-top: 2rem; font-size: 0.75rem; color: #718096;">
    <p>This report is prepared pursuant to 34 CFR &sect;300.306. Parents have the right to obtain an Independent Educational Evaluation if they disagree with the district's evaluation.</p>
  </footer>
</body>
</html>`;

  const docHash = crypto.createHash('sha256').update(content).digest('hex');
  return { content, docHash };
}
