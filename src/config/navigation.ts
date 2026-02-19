export type NavItem = {
  label: string;
  href: string;
  icon: string;
  minGradeLevel?: number;
};

export const studentNavItems: readonly NavItem[] = [
  { label: 'Start Learning', href: '/explore', icon: 'compass' },
  { label: 'Learn', href: '/learn', icon: 'book-open' },
  { label: 'Browse Curriculum', href: '/curriculum', icon: 'library' },
  {
    label: 'Financial Literacy',
    href: '/learn?subject=FINANCIAL_LITERACY',
    icon: 'banknote',
    minGradeLevel: 9,
  },
  { label: 'Calm Corner', href: '/regulate', icon: 'heart' },
  { label: 'My Progress', href: '/progress', icon: 'bar-chart' },
  { label: 'Community', href: '/community', icon: 'users' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
] as const;

export function getStudentNavItems(gradeLevel?: number): readonly NavItem[] {
  return studentNavItems.filter((item) => {
    if (item.minGradeLevel === undefined) {
      return true;
    }
    if (typeof gradeLevel !== 'number') {
      return false;
    }
    return gradeLevel >= item.minGradeLevel;
  });
}

export const educatorNavItems = [
  { label: 'Students', href: '/educator/students', icon: 'users' },
  { label: 'Classes', href: '/educator/classes', icon: 'school' },
  { label: 'Reports', href: '/educator/reports', icon: 'file-text' },
  { label: 'Compliance', href: '/educator/compliance', icon: 'shield-check' },
] as const;

export const parentNavItems = [
  { label: 'Grades', href: '/parent/grades', icon: 'progress' },
  { label: 'Consent', href: '/parent/consent', icon: 'shield-check' },
  { label: 'Settings', href: '/parent/settings', icon: 'settings' },
] as const;

export const adminNavItems = [
  { label: 'Super Admin Dashboard', href: '/admin/dashboard', icon: 'shield-check' },
  { label: 'Ingestion Control', href: '/admin/ingest', icon: 'shield-check' },
] as const;
