import { describe, expect, it } from 'vitest';
import {
  canManageMinorConsent,
  isConsentStatusTransitionAllowed,
  retentionPolicyRecords,
  requiresGuardianForDataRequest,
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

  it('defines retention categories for legal readiness', () => {
    expect(retentionPolicyRecords.length).toBeGreaterThanOrEqual(4);
    expect(retentionPolicyRecords.some((record) => record.category.includes('consent'))).toBe(true);
  });
});
