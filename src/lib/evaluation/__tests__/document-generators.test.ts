import { describe, it, expect } from 'vitest';
import { generatePwnDocument } from '../pwn-generator';
import { generateConsentDocument } from '../consent-generator';
import { generateEligibilityDocument } from '../eligibility-generator';

// ─── PWN Generator ──────────────────────────────────────────────────────────

describe('generatePwnDocument', () => {
  const baseParams = {
    studentName: 'Jane Student',
    districtName: 'Test District',
    actionDescription: 'Propose initial evaluation',
    reasonForAction: 'Academic concerns in reading',
    evaluationDescription: 'Curriculum-based measurement',
    otherOptionsConsidered: 'RTI tier 2 attempted',
    otherFactors: 'None',
    issueDate: '2025-10-01',
  };

  it('returns HTML content with student name', () => {
    const result = generatePwnDocument(baseParams);
    expect(result.content).toContain('Jane Student');
    expect(result.content).toContain('Prior Written Notice');
  });

  it('returns a SHA-256 hash', () => {
    const result = generatePwnDocument(baseParams);
    expect(result.docHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic — same params produce same hash', () => {
    const r1 = generatePwnDocument(baseParams);
    const r2 = generatePwnDocument(baseParams);
    expect(r1.docHash).toBe(r2.docHash);
    expect(r1.content).toBe(r2.content);
  });

  it('different params produce different hash', () => {
    const r1 = generatePwnDocument(baseParams);
    const r2 = generatePwnDocument({ ...baseParams, studentName: 'Other Student' });
    expect(r1.docHash).not.toBe(r2.docHash);
  });

  it('includes all 7 PWN sections', () => {
    const result = generatePwnDocument(baseParams);
    expect(result.content).toContain('Description of the Action');
    expect(result.content).toContain('Explanation of Why');
    expect(result.content).toContain('Evaluation Procedure');
    expect(result.content).toContain('Other Options Considered');
    expect(result.content).toContain('Other Factors');
    expect(result.content).toContain('Your Rights');
    expect(result.content).toContain('34 CFR');
  });

  it('includes district name in header', () => {
    const result = generatePwnDocument(baseParams);
    expect(result.content).toContain('Test District');
  });
});

// ─── Consent Generator ──────────────────────────────────────────────────────

describe('generateConsentDocument', () => {
  const baseParams = {
    consentType: 'INITIAL_EVALUATION' as const,
    studentName: 'Jane Student',
    districtName: 'Test District',
    evaluationDomains: ['COGNITIVE', 'ACADEMIC_ACHIEVEMENT'],
    issueDate: '2025-10-01',
  };

  it('returns HTML with correct title for INITIAL_EVALUATION', () => {
    const result = generateConsentDocument(baseParams);
    expect(result.content).toContain('Consent for Initial Evaluation');
  });

  it('returns HTML with correct title for REEVALUATION', () => {
    const result = generateConsentDocument({ ...baseParams, consentType: 'REEVALUATION' });
    expect(result.content).toContain('Consent for Reevaluation');
  });

  it('returns a SHA-256 hash', () => {
    const result = generateConsentDocument(baseParams);
    expect(result.docHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic', () => {
    const r1 = generateConsentDocument(baseParams);
    const r2 = generateConsentDocument(baseParams);
    expect(r1.docHash).toBe(r2.docHash);
  });

  it('lists evaluation domains', () => {
    const result = generateConsentDocument(baseParams);
    expect(result.content).toContain('COGNITIVE');
    expect(result.content).toContain('ACADEMIC_ACHIEVEMENT');
  });

  it('handles empty domains gracefully', () => {
    const result = generateConsentDocument({ ...baseParams, evaluationDomains: [] });
    expect(result.content).toContain('To be determined');
  });

  it('includes parent rights section', () => {
    const result = generateConsentDocument(baseParams);
    expect(result.content).toContain('Your Rights');
    expect(result.content).toContain('34 CFR');
    expect(result.content).toContain('I GRANT consent');
    expect(result.content).toContain('I REFUSE consent');
  });
});

// ─── Eligibility Generator ──────────────────────────────────────────────────

describe('generateEligibilityDocument', () => {
  const baseParams = {
    studentName: 'Jane Student',
    districtName: 'Test District',
    outcome: 'ELIGIBLE' as const,
    disabilityCategory: 'Specific Learning Disability',
    rationale: 'Student meets criteria based on assessment data.',
    assessmentSummary: 'Cognitive and academic assessments completed.',
    meetingDate: '2025-11-01',
    attendees: [
      { name: 'Parent A', role: 'PARENT' },
      { name: 'Teacher B', role: 'GENERAL_EDUCATION_TEACHER' },
    ],
  };

  it('returns HTML with ELIGIBLE outcome', () => {
    const result = generateEligibilityDocument(baseParams);
    expect(result.content).toContain('Eligible for Special Education Services');
  });

  it('returns HTML with NOT_ELIGIBLE outcome', () => {
    const result = generateEligibilityDocument({
      ...baseParams,
      outcome: 'NOT_ELIGIBLE',
      disabilityCategory: null,
    });
    expect(result.content).toContain('Not Eligible');
  });

  it('returns a SHA-256 hash', () => {
    const result = generateEligibilityDocument(baseParams);
    expect(result.docHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic', () => {
    const r1 = generateEligibilityDocument(baseParams);
    const r2 = generateEligibilityDocument(baseParams);
    expect(r1.docHash).toBe(r2.docHash);
  });

  it('includes disability category when provided', () => {
    const result = generateEligibilityDocument(baseParams);
    expect(result.content).toContain('Specific Learning Disability');
  });

  it('excludes disability category when null', () => {
    const result = generateEligibilityDocument({
      ...baseParams,
      disabilityCategory: null,
    });
    expect(result.content).not.toContain('Disability Category');
  });

  it('lists attendees in table', () => {
    const result = generateEligibilityDocument(baseParams);
    expect(result.content).toContain('Parent A');
    expect(result.content).toContain('Teacher B');
    expect(result.content).toContain('PARENT');
    expect(result.content).toContain('GENERAL_EDUCATION_TEACHER');
  });

  it('includes meeting date', () => {
    const result = generateEligibilityDocument(baseParams);
    expect(result.content).toContain('2025-11-01');
  });
});
