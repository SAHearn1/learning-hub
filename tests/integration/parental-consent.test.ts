/**
 * Parental Consent Workflow Integration Tests
 * Tests COPPA-compliant consent management
 */

import { describe, it, expect } from 'vitest';
import { canManageMinorConsent, isConsentStatusTransitionAllowed } from '@/lib/compliance';

describe('Parental Consent Workflow', () => {
  describe('Consent Management Permissions', () => {
    it('should allow parents to manage consent', () => {
      expect(canManageMinorConsent('PARENT')).toBe(true);
    });

    it('should allow school admins to manage consent', () => {
      expect(canManageMinorConsent('SCHOOL_ADMIN')).toBe(true);
    });

    it('should allow district admins to manage consent', () => {
      expect(canManageMinorConsent('DISTRICT_ADMIN')).toBe(true);
    });

    it('should allow platform admins to manage consent', () => {
      expect(canManageMinorConsent('PLATFORM_ADMIN')).toBe(true);
    });

    it('should not allow students to manage consent', () => {
      expect(canManageMinorConsent('STUDENT')).toBe(false);
    });

    it('should not allow educators to manage consent', () => {
      expect(canManageMinorConsent('EDUCATOR')).toBe(false);
    });
  });

  describe('Consent Status Transitions', () => {
    it('should allow transition from null to PENDING', () => {
      expect(isConsentStatusTransitionAllowed(null, 'PENDING')).toBe(true);
    });

    it('should allow transition from null to GRANTED', () => {
      expect(isConsentStatusTransitionAllowed(null, 'GRANTED')).toBe(true);
    });

    it('should allow transition from null to DENIED', () => {
      expect(isConsentStatusTransitionAllowed(null, 'DENIED')).toBe(true);
    });

    it('should allow transition from PENDING to GRANTED', () => {
      expect(isConsentStatusTransitionAllowed('PENDING', 'GRANTED')).toBe(true);
    });

    it('should allow transition from PENDING to DENIED', () => {
      expect(isConsentStatusTransitionAllowed('PENDING', 'DENIED')).toBe(true);
    });

    it('should allow transition from GRANTED to WITHDRAWN', () => {
      expect(isConsentStatusTransitionAllowed('GRANTED', 'WITHDRAWN')).toBe(true);
    });

    it('should allow transition from DENIED to GRANTED', () => {
      expect(isConsentStatusTransitionAllowed('DENIED', 'GRANTED')).toBe(true);
    });

    it('should allow transition from WITHDRAWN to GRANTED', () => {
      expect(isConsentStatusTransitionAllowed('WITHDRAWN', 'GRANTED')).toBe(true);
    });

    it('should not allow invalid transitions', () => {
      // Cannot go directly from GRANTED to DENIED
      expect(isConsentStatusTransitionAllowed('GRANTED', 'DENIED')).toBe(false);

      // Cannot go from GRANTED to PENDING
      expect(isConsentStatusTransitionAllowed('GRANTED', 'PENDING')).toBe(false);
    });
  });

  describe('Age Verification', () => {
    it('should identify minors under 13', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 10); // 10 years old

      const age = calculateAge(dob);
      expect(age).toBeLessThan(13);
    });

    it('should identify non-minors 13 and over', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 15); // 15 years old

      const age = calculateAge(dob);
      expect(age).toBeGreaterThanOrEqual(13);
    });
  });
});

// Helper function
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }

  return age;
}
