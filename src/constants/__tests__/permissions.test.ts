import { describe, it, expect } from 'vitest';
import { hasPermission, PERMISSIONS } from '../permissions';
import { ROLES } from '../roles';

describe('hasPermission', () => {
  describe('VIEW_OWN_PROGRESS', () => {
    it('allows STUDENT', () => {
      expect(hasPermission('STUDENT', 'VIEW_OWN_PROGRESS')).toBe(true);
    });

    it('allows PARENT', () => {
      expect(hasPermission('PARENT', 'VIEW_OWN_PROGRESS')).toBe(true);
    });

    it('denies EDUCATOR', () => {
      expect(hasPermission('EDUCATOR', 'VIEW_OWN_PROGRESS')).toBe(false);
    });
  });

  describe('VIEW_STUDENT_DATA', () => {
    it('allows EDUCATOR', () => {
      expect(hasPermission('EDUCATOR', 'VIEW_STUDENT_DATA')).toBe(true);
    });

    it('allows PLATFORM_ADMIN', () => {
      expect(hasPermission('PLATFORM_ADMIN', 'VIEW_STUDENT_DATA')).toBe(true);
    });

    it('denies STUDENT', () => {
      expect(hasPermission('STUDENT', 'VIEW_STUDENT_DATA')).toBe(false);
    });

    it('denies PARENT', () => {
      expect(hasPermission('PARENT', 'VIEW_STUDENT_DATA')).toBe(false);
    });
  });

  describe('MANAGE_CLASSES', () => {
    it('allows EDUCATOR', () => {
      expect(hasPermission('EDUCATOR', 'MANAGE_CLASSES')).toBe(true);
    });

    it('allows SCHOOL_ADMIN', () => {
      expect(hasPermission('SCHOOL_ADMIN', 'MANAGE_CLASSES')).toBe(true);
    });

    it('allows DISTRICT_ADMIN', () => {
      expect(hasPermission('DISTRICT_ADMIN', 'MANAGE_CLASSES')).toBe(true);
    });

    it('denies STUDENT', () => {
      expect(hasPermission('STUDENT', 'MANAGE_CLASSES')).toBe(false);
    });

    it('denies PLATFORM_ADMIN', () => {
      expect(hasPermission('PLATFORM_ADMIN', 'MANAGE_CLASSES')).toBe(false);
    });
  });

  describe('MANAGE_IEP', () => {
    it('allows EDUCATOR', () => {
      expect(hasPermission('EDUCATOR', 'MANAGE_IEP')).toBe(true);
    });

    it('allows SCHOOL_ADMIN', () => {
      expect(hasPermission('SCHOOL_ADMIN', 'MANAGE_IEP')).toBe(true);
    });

    it('denies DISTRICT_ADMIN', () => {
      expect(hasPermission('DISTRICT_ADMIN', 'MANAGE_IEP')).toBe(false);
    });
  });

  describe('PLATFORM_ADMIN', () => {
    it('allows only PLATFORM_ADMIN', () => {
      expect(hasPermission('PLATFORM_ADMIN', 'PLATFORM_ADMIN')).toBe(true);
    });

    it('denies all other roles', () => {
      const nonAdminRoles = ['STUDENT', 'EDUCATOR', 'PARENT', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN'] as const;
      for (const role of nonAdminRoles) {
        expect(hasPermission(role, 'PLATFORM_ADMIN')).toBe(false);
      }
    });
  });

  describe('MANAGE_BILLING', () => {
    it('allows SCHOOL_ADMIN', () => {
      expect(hasPermission('SCHOOL_ADMIN', 'MANAGE_BILLING')).toBe(true);
    });

    it('allows DISTRICT_ADMIN', () => {
      expect(hasPermission('DISTRICT_ADMIN', 'MANAGE_BILLING')).toBe(true);
    });

    it('allows PLATFORM_ADMIN', () => {
      expect(hasPermission('PLATFORM_ADMIN', 'MANAGE_BILLING')).toBe(true);
    });

    it('denies EDUCATOR', () => {
      expect(hasPermission('EDUCATOR', 'MANAGE_BILLING')).toBe(false);
    });
  });
});

describe('PERMISSIONS constant', () => {
  it('has entries for all expected permission keys', () => {
    const expectedKeys = [
      'VIEW_OWN_PROGRESS',
      'VIEW_STUDENT_DATA',
      'VIEW_CURRICULUM',
      'MANAGE_CLASSES',
      'MANAGE_IEP',
      'MANAGE_GLOBAL_CURRICULUM',
      'MANAGE_SCHOOL_CURRICULUM',
      'MANAGE_CLASSROOM_LEARNING_PATHS',
      'VIEW_COMPLIANCE',
      'MANAGE_BILLING',
      'MANAGE_TENANT',
      'PLATFORM_ADMIN',
    ];
    expect(Object.keys(PERMISSIONS)).toEqual(expectedKeys);
  });
});
