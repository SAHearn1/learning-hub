export type SupportTier = 'Tier 1' | 'Tier 2' | 'Tier 3';

export type Student = {
  id: string;
  name: string;
  grade: string;
  classIds: string[];
  supportTier: SupportTier;
  iep: boolean;
  accommodations: string[];
  progress: number;
  attendance: number;
};

export type ClassRecord = {
  id: string;
  name: string;
  period: string;
  capacity: number;
  studentIds: string[];
  subject: string;
};

export type ProgressRecord = {
  studentId: string;
  classId: string;
  subject: string;
  growth: number;
  mastery: number;
  missingAssignments: number;
  updatedAt: string;
};

export type ComplianceRecord = {
  id: string;
  category: 'IEP' | 'Assessment' | 'Communication' | 'Audit';
  requirement: string;
  owner: string;
  dueDate: string;
  status: 'On Track' | 'At Risk' | 'Overdue';
  completion: number;
};

export const accommodationCatalog = [
  'Extended time',
  'Preferential seating',
  'Reduced-distraction setting',
  'Text-to-speech support',
  'Frequent check-ins',
  'Chunked assignments',
];

export const initialStudents: Student[] = [
  {
    id: 'stu-01',
    name: 'Maya Chen',
    grade: 'Grade 4',
    classIds: ['cls-ela', 'cls-math'],
    supportTier: 'Tier 2',
    iep: true,
    accommodations: ['Extended time', 'Chunked assignments'],
    progress: 78,
    attendance: 96,
  },
  {
    id: 'stu-02',
    name: 'Noah Patel',
    grade: 'Grade 5',
    classIds: ['cls-sci', 'cls-math'],
    supportTier: 'Tier 1',
    iep: false,
    accommodations: [],
    progress: 84,
    attendance: 93,
  },
  {
    id: 'stu-03',
    name: 'Ava Martinez',
    grade: 'Grade 4',
    classIds: ['cls-ela', 'cls-soc'],
    supportTier: 'Tier 3',
    iep: true,
    accommodations: ['Preferential seating', 'Frequent check-ins'],
    progress: 63,
    attendance: 89,
  },
  {
    id: 'stu-04',
    name: 'Liam Johnson',
    grade: 'Grade 5',
    classIds: ['cls-sci', 'cls-soc'],
    supportTier: 'Tier 2',
    iep: false,
    accommodations: [],
    progress: 71,
    attendance: 92,
  },
];

export const initialClasses: ClassRecord[] = [
  {
    id: 'cls-ela',
    name: 'ELA Foundations',
    period: '1st Period',
    capacity: 24,
    studentIds: ['stu-01', 'stu-03'],
    subject: 'ELA',
  },
  {
    id: 'cls-math',
    name: 'Math Concepts',
    period: '2nd Period',
    capacity: 22,
    studentIds: ['stu-01', 'stu-02'],
    subject: 'Math',
  },
  {
    id: 'cls-sci',
    name: 'Science Lab',
    period: '3rd Period',
    capacity: 20,
    studentIds: ['stu-02', 'stu-04'],
    subject: 'Science',
  },
  {
    id: 'cls-soc',
    name: 'Social Studies',
    period: '4th Period',
    capacity: 24,
    studentIds: ['stu-03', 'stu-04'],
    subject: 'Social Studies',
  },
];

export const progressRecords: ProgressRecord[] = [
  { studentId: 'stu-01', classId: 'cls-ela', subject: 'ELA', growth: 9, mastery: 81, missingAssignments: 0, updatedAt: '2026-02-01' },
  { studentId: 'stu-01', classId: 'cls-math', subject: 'Math', growth: 6, mastery: 74, missingAssignments: 1, updatedAt: '2026-01-31' },
  { studentId: 'stu-02', classId: 'cls-math', subject: 'Math', growth: 7, mastery: 86, missingAssignments: 0, updatedAt: '2026-02-02' },
  { studentId: 'stu-02', classId: 'cls-sci', subject: 'Science', growth: 5, mastery: 82, missingAssignments: 0, updatedAt: '2026-02-02' },
  { studentId: 'stu-03', classId: 'cls-ela', subject: 'ELA', growth: 4, mastery: 62, missingAssignments: 2, updatedAt: '2026-01-30' },
  { studentId: 'stu-03', classId: 'cls-soc', subject: 'Social Studies', growth: 3, mastery: 65, missingAssignments: 1, updatedAt: '2026-01-30' },
  { studentId: 'stu-04', classId: 'cls-sci', subject: 'Science', growth: 5, mastery: 73, missingAssignments: 1, updatedAt: '2026-02-01' },
  { studentId: 'stu-04', classId: 'cls-soc', subject: 'Social Studies', growth: 6, mastery: 69, missingAssignments: 0, updatedAt: '2026-02-01' },
];

export const complianceRecords: ComplianceRecord[] = [
  {
    id: 'cmp-01',
    category: 'IEP',
    requirement: 'Quarterly IEP progress updates submitted',
    owner: 'Case Manager Team',
    dueDate: '2026-02-10',
    status: 'On Track',
    completion: 82,
  },
  {
    id: 'cmp-02',
    category: 'Assessment',
    requirement: 'Universal screener window closed with 95% completion',
    owner: 'Assessment Coordinator',
    dueDate: '2026-02-07',
    status: 'At Risk',
    completion: 71,
  },
  {
    id: 'cmp-03',
    category: 'Communication',
    requirement: 'Family notices sent in home language for all IEP meetings',
    owner: 'Student Services',
    dueDate: '2026-02-05',
    status: 'Overdue',
    completion: 58,
  },
  {
    id: 'cmp-04',
    category: 'Audit',
    requirement: 'Accommodation delivery logs archived for state review',
    owner: 'Compliance Office',
    dueDate: '2026-02-14',
    status: 'On Track',
    completion: 77,
  },
];
