import { describe, it, expect } from 'vitest';
import { generateProgressReportDocument } from '../report-generator';
import type { ProgressReportParams } from '../report-generator';

function makeParams(overrides: Partial<ProgressReportParams> = {}): ProgressReportParams {
  return {
    goalCode: 'MATH-001',
    goalDescription: 'Student will solve 2-digit addition problems.',
    studentName: 'Jane Doe',
    districtName: 'Springfield District',
    reportingPeriodStart: '2025-09-01',
    reportingPeriodEnd: '2025-09-30',
    baselineValue: 30,
    targetValue: 80,
    currentValue: 55,
    measurementUnit: 'percent correct',
    entryCount: 5,
    trendDirection: 'IMPROVING' as const,
    trendSlope: 1.2,
    ...overrides,
  };
}

describe('generateProgressReportDocument', () => {
  it('generates HTML with goal code and student name', () => {
    const result = generateProgressReportDocument(makeParams());
    expect(result.content).toContain('MATH-001');
    expect(result.content).toContain('Jane Doe');
    expect(result.content).toContain('Springfield District');
  });

  it('includes progress values in output', () => {
    const result = generateProgressReportDocument(makeParams());
    expect(result.content).toContain('30');  // baseline
    expect(result.content).toContain('80');  // target
    expect(result.content).toContain('55');  // current
    expect(result.content).toContain('5 observations');
  });

  it('includes reporting period dates', () => {
    const result = generateProgressReportDocument(makeParams());
    expect(result.content).toContain('2025-09-01');
    expect(result.content).toContain('2025-09-30');
  });

  it('generates deterministic hash for identical inputs', () => {
    const params = makeParams();
    const result1 = generateProgressReportDocument(params);
    const result2 = generateProgressReportDocument(params);
    expect(result1.reportHash).toBe(result2.reportHash);
    expect(result1.reportHash).toHaveLength(64); // SHA-256 hex
  });

  it('generates different hashes for different inputs', () => {
    const result1 = generateProgressReportDocument(makeParams());
    const result2 = generateProgressReportDocument(
      makeParams({ studentName: 'John Doe' }),
    );
    expect(result1.reportHash).not.toBe(result2.reportHash);
  });

  it('shows correct trend label for IMPROVING', () => {
    const result = generateProgressReportDocument(
      makeParams({ trendDirection: 'IMPROVING' }),
    );
    expect(result.content).toContain('Improving');
  });

  it('shows correct trend label for DECLINING', () => {
    const result = generateProgressReportDocument(
      makeParams({ trendDirection: 'DECLINING' }),
    );
    expect(result.content).toContain('Declining');
  });

  it('includes legal reference to 34 CFR §300.320(a)(3)', () => {
    const result = generateProgressReportDocument(makeParams());
    expect(result.content).toContain('300.320(a)(3)');
  });
});
