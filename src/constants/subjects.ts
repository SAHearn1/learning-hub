export const SUBJECTS = {
  MATH: 'MATH',
  SCIENCE: 'SCIENCE',
  LANGUAGE_ARTS: 'LANGUAGE_ARTS',
  FINANCIAL_LITERACY: 'FINANCIAL_LITERACY',
} as const;

export type SubjectKey = keyof typeof SUBJECTS;
