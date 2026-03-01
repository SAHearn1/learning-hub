/**
 * Deterministic Progress Report Generator
 *
 * Produces HTML from goal/entries/trend data — no LLM involvement.
 * SHA-256 hash ensures content integrity. Same pattern as notice-generator.ts.
 */

import crypto from 'crypto';
import type { TrendDirection } from '@/types/progress-monitoring';

export type ProgressReportParams = {
  goalCode: string;
  goalDescription: string;
  studentName: string;
  districtName: string;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  baselineValue: number;
  targetValue: number;
  currentValue: number;
  measurementUnit: string;
  entryCount: number;
  trendDirection: TrendDirection;
  trendSlope: number | null;
};

export type GeneratedProgressReport = {
  content: string;
  reportHash: string;
};

const TREND_LABELS: Record<TrendDirection, string> = {
  IMPROVING: 'Improving',
  FLAT: 'Flat (No Change)',
  DECLINING: 'Declining',
};

const TREND_COLORS: Record<TrendDirection, string> = {
  IMPROVING: '#16a34a',
  FLAT: '#d97706',
  DECLINING: '#dc2626',
};

export function generateProgressReportDocument(
  params: ProgressReportParams,
): GeneratedProgressReport {
  const percentProgress =
    params.targetValue !== params.baselineValue
      ? (
          ((params.currentValue - params.baselineValue) /
            (params.targetValue - params.baselineValue)) *
          100
        ).toFixed(1)
      : '0.0';

  const trendLabel = TREND_LABELS[params.trendDirection];
  const trendColor = TREND_COLORS[params.trendDirection];

  const content = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Progress Report — ${params.goalCode}</title></head>
<body style="font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 2rem;">
  <header style="border-bottom: 2px solid #1a365d; padding-bottom: 1rem; margin-bottom: 2rem;">
    <h1 style="color: #1a365d; font-size: 1.25rem;">${params.districtName}</h1>
    <p style="color: #4a5568; font-size: 0.875rem;">Reporting Period: ${params.reportingPeriodStart} &mdash; ${params.reportingPeriodEnd}</p>
  </header>

  <h1 style="color: #1a365d;">IEP Goal Progress Report</h1>
  <p><strong>Student:</strong> ${params.studentName}</p>
  <p><strong>Goal:</strong> ${params.goalCode} &mdash; ${params.goalDescription}</p>

  <h2>Progress Summary</h2>
  <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 0.5rem; font-weight: bold;">Baseline</td>
      <td style="padding: 0.5rem;">${params.baselineValue} ${params.measurementUnit}</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 0.5rem; font-weight: bold;">Target</td>
      <td style="padding: 0.5rem;">${params.targetValue} ${params.measurementUnit}</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 0.5rem; font-weight: bold;">Current</td>
      <td style="padding: 0.5rem;">${params.currentValue} ${params.measurementUnit}</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 0.5rem; font-weight: bold;">Progress</td>
      <td style="padding: 0.5rem;">${percentProgress}% toward target</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 0.5rem; font-weight: bold;">Data Points</td>
      <td style="padding: 0.5rem;">${params.entryCount} observations</td>
    </tr>
    <tr>
      <td style="padding: 0.5rem; font-weight: bold;">Trend</td>
      <td style="padding: 0.5rem; color: ${trendColor}; font-weight: bold;">${trendLabel}</td>
    </tr>
  </table>

  <p style="margin-top: 1rem;">This report is generated pursuant to 34 CFR &sect;300.320(a)(3), which requires periodic reports on the progress the child is making toward meeting the annual goals.</p>

  <footer style="border-top: 1px solid #cbd5e0; padding-top: 1rem; margin-top: 2rem; font-size: 0.75rem; color: #718096;">
    <p>If you have questions about this report, please contact your child's special education case manager or the district's special education office.</p>
  </footer>
</body>
</html>`;

  const reportHash = crypto.createHash('sha256').update(content).digest('hex');

  return { content, reportHash };
}
