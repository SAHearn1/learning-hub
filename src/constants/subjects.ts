export const SUBJECTS = {
  MATH: 'MATH',
  SCIENCE: 'SCIENCE',
  LANGUAGE_ARTS: 'LANGUAGE_ARTS',
} as const;

export type SubjectKey = keyof typeof SUBJECTS;
