'use client';

import { create } from 'zustand';
import {
  accommodationCatalog,
  ClassRecord,
  complianceRecords,
  ComplianceRecord,
  initialClasses,
  initialStudents,
  progressRecords,
  ProgressRecord,
  Student,
  SupportTier,
} from '@/app/educator/mock-data';

type ComplianceStatus = ComplianceRecord['status'];

type NewStudentInput = {
  firstName: string;
  lastName: string;
  grade: string;
  supportTier: SupportTier;
};

type NewClassInput = {
  name: string;
  period: string;
  subject: string;
  capacity: number;
};

type EducatorPortalState = {
  students: Student[];
  classes: ClassRecord[];
  progress: ProgressRecord[];
  compliance: ComplianceRecord[];
  addStudent: (input: NewStudentInput) => string | null;
  setStudentTier: (studentId: string, tier: SupportTier) => void;
  toggleStudentAccommodation: (studentId: string, accommodation: string) => void;
  createClass: (input: NewClassInput) => string | null;
  toggleEnrollment: (classId: string, studentId: string) => { ok: boolean; reason?: string };
  updateComplianceStatus: (recordId: string, status: ComplianceStatus) => void;
};

const buildId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

export const useEducatorPortalStore = create<EducatorPortalState>((set, get) => ({
  students: initialStudents,
  classes: initialClasses,
  progress: progressRecords,
  compliance: complianceRecordsWithCalculatedStatus(),

  addStudent: ({ firstName, lastName, grade, supportTier }) => {
    const name = `${firstName} ${lastName}`.trim();
    if (!name) return null;

    const id = buildId('stu');
    const student: Student = {
      id,
      name,
      grade,
      supportTier,
      classIds: [],
      iep: false,
      accommodations: [],
      progress: 0,
      attendance: 100,
    };

    set((state) => ({ students: [student, ...state.students] }));
    return id;
  },

  setStudentTier: (studentId, tier) => {
    set((state) => ({
      students: state.students.map((student) => (student.id === studentId ? { ...student, supportTier: tier } : student)),
    }));
  },

  toggleStudentAccommodation: (studentId, accommodation) => {
    if (!accommodationCatalog.includes(accommodation)) return;

    set((state) => ({
      students: state.students.map((student) => {
        if (student.id !== studentId) return student;
        const accommodations = student.accommodations.includes(accommodation)
          ? student.accommodations.filter((item) => item !== accommodation)
          : [...student.accommodations, accommodation];

        return {
          ...student,
          accommodations,
          iep: accommodations.length > 0,
        };
      }),
    }));
  },

  createClass: ({ name, period, subject, capacity }) => {
    if (!name.trim() || !period.trim() || capacity < 1) return null;

    const id = buildId('cls');
    const classRecord: ClassRecord = {
      id,
      name: name.trim(),
      period: period.trim(),
      subject: subject.trim() || 'General',
      capacity,
      studentIds: [],
    };

    set((state) => ({ classes: [...state.classes, classRecord] }));
    return id;
  },

  toggleEnrollment: (classId, studentId) => {
    const state = get();
    const classRecord = state.classes.find((item) => item.id === classId);
    if (!classRecord) return { ok: false, reason: 'Class not found.' };

    const isEnrolled = classRecord.studentIds.includes(studentId);
    if (!isEnrolled && classRecord.studentIds.length >= classRecord.capacity) {
      return { ok: false, reason: 'Class is at capacity.' };
    }

    set((curr) => {
      const classes = curr.classes.map((item) => {
        if (item.id !== classId) return item;

        const studentIds = isEnrolled
          ? item.studentIds.filter((id) => id !== studentId)
          : [...item.studentIds, studentId];

        return { ...item, studentIds };
      });

      const students = curr.students.map((student) => {
        if (student.id !== studentId) return student;

        const classIds = isEnrolled
          ? student.classIds.filter((id) => id !== classId)
          : [...student.classIds, classId];

        return { ...student, classIds };
      });

      return { classes, students };
    });

    return { ok: true };
  },

  updateComplianceStatus: (recordId, status) => {
    set((state) => ({
      compliance: state.compliance.map((record) => {
        if (record.id !== recordId) return record;

        const completionByStatus: Record<ComplianceStatus, number> = {
          'On Track': Math.max(record.completion, 75),
          'At Risk': Math.min(Math.max(record.completion, 40), 74),
          Overdue: Math.min(record.completion, 39),
        };

        return { ...record, status, completion: completionByStatus[status] };
      }),
    }));
  },
}));

function complianceRecordsWithCalculatedStatus() {
  const today = new Date('2026-02-06');

  return complianceRecords.map((record) => {
    const dueDate = new Date(record.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const status: ComplianceStatus = daysUntilDue < 0 ? 'Overdue' : daysUntilDue <= 3 ? 'At Risk' : 'On Track';

    return { ...record, status };
  });
}
