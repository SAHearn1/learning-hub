import { describe, it, expect } from 'vitest';
import { hasPermission } from '@/constants/permissions';
import {
  canManageGlobalCurriculum,
  canManageSchoolCurriculum,
  canManageClassroomLearningPaths,
} from '@/lib/rbac';
import type { UserRole } from '@prisma/client';

describe('RBAC - Role-Based Access Control', () => {
  describe('Permission Checks', () => {
    it('should allow PLATFORM_ADMIN to manage global curriculum', () => {
      expect(hasPermission('PLATFORM_ADMIN', 'MANAGE_GLOBAL_CURRICULUM')).toBe(true);
    });

    it('should NOT allow EDUCATOR to manage global curriculum', () => {
      expect(hasPermission('EDUCATOR', 'MANAGE_GLOBAL_CURRICULUM')).toBe(false);
    });

    it('should NOT allow SCHOOL_ADMIN to manage global curriculum', () => {
      expect(hasPermission('SCHOOL_ADMIN', 'MANAGE_GLOBAL_CURRICULUM')).toBe(false);
    });

    it('should NOT allow DISTRICT_ADMIN to manage global curriculum', () => {
      expect(hasPermission('DISTRICT_ADMIN', 'MANAGE_GLOBAL_CURRICULUM')).toBe(false);
    });

    it('should allow EDUCATOR to manage classroom learning paths', () => {
      expect(hasPermission('EDUCATOR', 'MANAGE_CLASSROOM_LEARNING_PATHS')).toBe(true);
    });

    it('should allow SCHOOL_ADMIN to manage classroom learning paths', () => {
      expect(hasPermission('SCHOOL_ADMIN', 'MANAGE_CLASSROOM_LEARNING_PATHS')).toBe(true);
    });

    it('should allow SCHOOL_ADMIN to manage school curriculum', () => {
      expect(hasPermission('SCHOOL_ADMIN', 'MANAGE_SCHOOL_CURRICULUM')).toBe(true);
    });

    it('should allow DISTRICT_ADMIN to manage school curriculum', () => {
      expect(hasPermission('DISTRICT_ADMIN', 'MANAGE_SCHOOL_CURRICULUM')).toBe(true);
    });

    it('should NOT allow EDUCATOR to manage school curriculum', () => {
      expect(hasPermission('EDUCATOR', 'MANAGE_SCHOOL_CURRICULUM')).toBe(false);
    });

    it('should allow STUDENT to view curriculum', () => {
      expect(hasPermission('STUDENT', 'VIEW_CURRICULUM')).toBe(true);
    });

    it('should NOT allow STUDENT to manage classes', () => {
      expect(hasPermission('STUDENT', 'MANAGE_CLASSES')).toBe(false);
    });
  });

  describe('Curriculum Management Functions', () => {
    it('should return true for PLATFORM_ADMIN global curriculum management', () => {
      expect(canManageGlobalCurriculum('PLATFORM_ADMIN')).toBe(true);
    });

    it('should return false for EDUCATOR global curriculum management', () => {
      expect(canManageGlobalCurriculum('EDUCATOR')).toBe(false);
    });

    it('should return false for SCHOOL_ADMIN global curriculum management', () => {
      expect(canManageGlobalCurriculum('SCHOOL_ADMIN')).toBe(false);
    });

    it('should return true for SCHOOL_ADMIN school curriculum management', () => {
      expect(canManageSchoolCurriculum('SCHOOL_ADMIN')).toBe(true);
    });

    it('should return true for DISTRICT_ADMIN school curriculum management', () => {
      expect(canManageSchoolCurriculum('DISTRICT_ADMIN')).toBe(true);
    });

    it('should return false for EDUCATOR school curriculum management', () => {
      expect(canManageSchoolCurriculum('EDUCATOR')).toBe(false);
    });

    it('should return true for EDUCATOR classroom learning path management', () => {
      expect(canManageClassroomLearningPaths('EDUCATOR')).toBe(true);
    });

    it('should return true for SCHOOL_ADMIN classroom learning path management', () => {
      expect(canManageClassroomLearningPaths('SCHOOL_ADMIN')).toBe(true);
    });

    it('should return false for STUDENT classroom learning path management', () => {
      expect(canManageClassroomLearningPaths('STUDENT')).toBe(false);
    });
  });

  describe('Role Hierarchy', () => {
    const roles: UserRole[] = [
      'STUDENT',
      'PARENT',
      'EDUCATOR',
      'SCHOOL_ADMIN',
      'DISTRICT_ADMIN',
      'PLATFORM_ADMIN',
    ];

    it('should have PLATFORM_ADMIN with highest privileges', () => {
      expect(hasPermission('PLATFORM_ADMIN', 'MANAGE_GLOBAL_CURRICULUM')).toBe(true);
      expect(hasPermission('PLATFORM_ADMIN', 'MANAGE_SCHOOL_CURRICULUM')).toBe(true);
      expect(hasPermission('PLATFORM_ADMIN', 'MANAGE_CLASSROOM_LEARNING_PATHS')).toBe(true);
      expect(hasPermission('PLATFORM_ADMIN', 'MANAGE_TENANT')).toBe(true);
      expect(hasPermission('PLATFORM_ADMIN', 'PLATFORM_ADMIN')).toBe(true);
    });

    it('should have STUDENT with minimal privileges', () => {
      expect(hasPermission('STUDENT', 'MANAGE_GLOBAL_CURRICULUM')).toBe(false);
      expect(hasPermission('STUDENT', 'MANAGE_SCHOOL_CURRICULUM')).toBe(false);
      expect(hasPermission('STUDENT', 'MANAGE_CLASSROOM_LEARNING_PATHS')).toBe(false);
      expect(hasPermission('STUDENT', 'MANAGE_CLASSES')).toBe(false);
      expect(hasPermission('STUDENT', 'VIEW_OWN_PROGRESS')).toBe(true);
    });

    it('should enforce granular permissions for EDUCATOR', () => {
      // Teachers CAN manage their classroom learning paths
      expect(hasPermission('EDUCATOR', 'MANAGE_CLASSROOM_LEARNING_PATHS')).toBe(true);
      expect(hasPermission('EDUCATOR', 'MANAGE_CLASSES')).toBe(true);
      expect(hasPermission('EDUCATOR', 'VIEW_STUDENT_DATA')).toBe(true);

      // Teachers CANNOT manage global or school curriculum
      expect(hasPermission('EDUCATOR', 'MANAGE_GLOBAL_CURRICULUM')).toBe(false);
      expect(hasPermission('EDUCATOR', 'MANAGE_SCHOOL_CURRICULUM')).toBe(false);
      expect(hasPermission('EDUCATOR', 'MANAGE_TENANT')).toBe(false);
      expect(hasPermission('EDUCATOR', 'PLATFORM_ADMIN')).toBe(false);
    });
  });

  describe('Specific RBAC Requirements', () => {
    it('should prevent Teachers from modifying global curriculum settings', () => {
      // Teachers should NOT have permission to modify global curriculum
      expect(canManageGlobalCurriculum('EDUCATOR')).toBe(false);
      expect(hasPermission('EDUCATOR', 'MANAGE_GLOBAL_CURRICULUM')).toBe(false);
    });

    it('should allow Teachers to modify their classroom specific learning paths', () => {
      // Teachers SHOULD have permission to modify classroom learning paths
      expect(canManageClassroomLearningPaths('EDUCATOR')).toBe(true);
      expect(hasPermission('EDUCATOR', 'MANAGE_CLASSROOM_LEARNING_PATHS')).toBe(true);
    });

    it('should allow SuperAdmin to modify global curriculum settings', () => {
      // SuperAdmin (PLATFORM_ADMIN) SHOULD have permission to modify global curriculum
      expect(canManageGlobalCurriculum('PLATFORM_ADMIN')).toBe(true);
      expect(hasPermission('PLATFORM_ADMIN', 'MANAGE_GLOBAL_CURRICULUM')).toBe(true);
    });

    it('should allow SchoolAdmin to manage school-level settings but not global', () => {
      // SchoolAdmin CAN manage school curriculum
      expect(canManageSchoolCurriculum('SCHOOL_ADMIN')).toBe(true);
      expect(hasPermission('SCHOOL_ADMIN', 'MANAGE_SCHOOL_CURRICULUM')).toBe(true);

      // SchoolAdmin CANNOT manage global curriculum
      expect(canManageGlobalCurriculum('SCHOOL_ADMIN')).toBe(false);
      expect(hasPermission('SCHOOL_ADMIN', 'MANAGE_GLOBAL_CURRICULUM')).toBe(false);
    });

    it('should differentiate between SuperAdmin, SchoolAdmin, Teacher, and Student', () => {
      const permissions = [
        'MANAGE_GLOBAL_CURRICULUM',
        'MANAGE_SCHOOL_CURRICULUM',
        'MANAGE_CLASSROOM_LEARNING_PATHS',
        'VIEW_CURRICULUM',
      ] as const;

      // SuperAdmin (PLATFORM_ADMIN)
      expect(hasPermission('PLATFORM_ADMIN', 'MANAGE_GLOBAL_CURRICULUM')).toBe(true);
      expect(hasPermission('PLATFORM_ADMIN', 'MANAGE_SCHOOL_CURRICULUM')).toBe(true);
      expect(hasPermission('PLATFORM_ADMIN', 'MANAGE_CLASSROOM_LEARNING_PATHS')).toBe(true);

      // SchoolAdmin (SCHOOL_ADMIN)
      expect(hasPermission('SCHOOL_ADMIN', 'MANAGE_GLOBAL_CURRICULUM')).toBe(false);
      expect(hasPermission('SCHOOL_ADMIN', 'MANAGE_SCHOOL_CURRICULUM')).toBe(true);
      expect(hasPermission('SCHOOL_ADMIN', 'MANAGE_CLASSROOM_LEARNING_PATHS')).toBe(true);

      // Teacher (EDUCATOR)
      expect(hasPermission('EDUCATOR', 'MANAGE_GLOBAL_CURRICULUM')).toBe(false);
      expect(hasPermission('EDUCATOR', 'MANAGE_SCHOOL_CURRICULUM')).toBe(false);
      expect(hasPermission('EDUCATOR', 'MANAGE_CLASSROOM_LEARNING_PATHS')).toBe(true);

      // Student
      expect(hasPermission('STUDENT', 'MANAGE_GLOBAL_CURRICULUM')).toBe(false);
      expect(hasPermission('STUDENT', 'MANAGE_SCHOOL_CURRICULUM')).toBe(false);
      expect(hasPermission('STUDENT', 'MANAGE_CLASSROOM_LEARNING_PATHS')).toBe(false);
      expect(hasPermission('STUDENT', 'VIEW_CURRICULUM')).toBe(true);
    });
  });
});
