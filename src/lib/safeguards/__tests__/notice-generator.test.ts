import { describe, it, expect } from 'vitest';
import { generateSafeguardsNoticeDocument } from '../notice-generator';

describe('generateSafeguardsNoticeDocument', () => {
  it('generates HTML with correct title for annual notice', () => {
    const result = generateSafeguardsNoticeDocument({
      trigger: 'ANNUAL_NOTICE',
      studentName: 'Jane Doe',
      districtName: 'Springfield District',
      schoolYear: '2025-2026',
      issueDate: '2025-09-15',
    });

    expect(result.content).toContain('Annual Procedural Safeguards Notice');
    expect(result.content).toContain('Jane Doe');
    expect(result.content).toContain('Springfield District');
    expect(result.content).toContain('2025-2026');
    expect(result.content).toContain('2025-09-15');
    expect(result.content).toContain('34 CFR §300.504');
  });

  it('generates deterministic hash for identical inputs', () => {
    const params = {
      trigger: 'PARENT_REQUEST' as const,
      studentName: 'John Smith',
      districtName: 'Riverside District',
      schoolYear: '2025-2026',
      issueDate: '2025-10-01',
    };

    const result1 = generateSafeguardsNoticeDocument(params);
    const result2 = generateSafeguardsNoticeDocument(params);

    expect(result1.docHash).toBe(result2.docHash);
    expect(result1.docHash).toHaveLength(64); // SHA-256 hex
  });

  it('generates different hashes for different inputs', () => {
    const base = {
      trigger: 'ANNUAL_NOTICE' as const,
      studentName: 'Jane Doe',
      districtName: 'Springfield District',
      schoolYear: '2025-2026',
      issueDate: '2025-09-15',
    };

    const result1 = generateSafeguardsNoticeDocument(base);
    const result2 = generateSafeguardsNoticeDocument({
      ...base,
      studentName: 'John Doe',
    });

    expect(result1.docHash).not.toBe(result2.docHash);
  });

  it('includes trigger-specific description for disciplinary placement', () => {
    const result = generateSafeguardsNoticeDocument({
      trigger: 'DISCIPLINARY_CHANGE_OF_PLACEMENT',
      studentName: 'Test Student',
      districtName: 'Test District',
      schoolYear: '2025-2026',
      issueDate: '2025-11-01',
    });

    expect(result.content).toContain('disciplinary');
    expect(result.content).toContain('§300.530');
  });
});
