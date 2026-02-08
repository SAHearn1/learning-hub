import { describe, expect, it } from 'vitest';
import {
  canManageMinorConsent,
  isConsentStatusTransitionAllowed,
  retentionPolicyRecords,
  requiresGuardianForDataRequest,
  hasOperationalConsentForLearning,
  assertMinorConsentForLearning,
} from '@/lib/compliance';

describe('compliance utilities', () => {
  it('allows only guardian/admin roles to manage minor consent', () => {
    expect(canManageMinorConsent('PARENT')).toBe(true);
    expect(canManageMinorConsent('SCHOOL_ADMIN')).toBe(true);
    expect(canManageMinorConsent('STUDENT')).toBe(false);
  });

  it('validates consent status transitions', () => {
    expect(isConsentStatusTransitionAllowed(null, 'PENDING')).toBe(true);
    expect(isConsentStatusTransitionAllowed('GRANTED', 'WITHDRAWN')).toBe(true);
    expect(isConsentStatusTransitionAllowed('GRANTED', 'DENIED')).toBe(false);
  });

  it('requires guardian role for minor data-rights requests', () => {
    expect(requiresGuardianForDataRequest(true, 'STUDENT')).toBe(true);
    expect(requiresGuardianForDataRequest(true, 'PARENT')).toBe(false);
    expect(requiresGuardianForDataRequest(false, 'STUDENT')).toBe(false);
  });


  it('requires granted consent before minors can access learning workflows', () => {
    expect(hasOperationalConsentForLearning(true, 'GRANTED')).toBe(true);
    expect(hasOperationalConsentForLearning(true, 'PENDING')).toBe(false);
    expect(hasOperationalConsentForLearning(false, null)).toBe(true);
  });

  it('throws a forbidden error when minor consent is not granted', () => {
    expect(() =>
      assertMinorConsentForLearning(true, 'DENIED', { action: 'starting a learning session' }),
    ).toThrowError('Parental consent is required before starting a learning session.');

    expect(() =>
      assertMinorConsentForLearning(true, 'GRANTED', { action: 'starting a learning session' }),
    ).not.toThrow();
  });

  it('defines retention categories for legal readiness', () => {
    expect(retentionPolicyRecords.length).toBeGreaterThanOrEqual(4);
    expect(retentionPolicyRecords.some((record) => record.category.includes('consent'))).toBe(true);
  });
});
