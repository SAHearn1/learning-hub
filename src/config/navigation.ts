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
  { label: 'My Classes', href: '/student/classes', icon: 'school' },
  { label: 'Review', href: '/student/review', icon: 'refresh-cw' },
  { label: 'Accommodations', href: '/student/accommodations', icon: 'accessibility' },
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
  { label: 'Grades', href: '/educator/grades', icon: 'check-square' },
  { label: 'Templates', href: '/educator/templates', icon: 'file-plus' },
  { label: 'Bulk Operations', href: '/educator/bulk', icon: 'layers' },
  { label: 'Calendar', href: '/educator/calendar', icon: 'calendar' },
] as const;

export const parentNavItems = [
  { label: 'Children', href: '/parent/children', icon: 'users' },
  { label: 'Activity', href: '/parent/activity', icon: 'activity' },
  { label: 'Grades', href: '/parent/grades', icon: 'progress' },
  { label: 'Consent', href: '/parent/consent', icon: 'shield-check' },
  { label: 'Discipline', href: '/parent/discipline', icon: 'alert-triangle' },
  { label: 'Settings', href: '/parent/settings', icon: 'settings' },
] as const;

export const schoolAdminNavItems = [
  { label: 'Dashboard', href: '/school-admin/dashboard', icon: 'layout-dashboard' },
  { label: 'Classes', href: '/school-admin/classes', icon: 'school' },
  { label: 'Educators', href: '/school-admin/educators', icon: 'users' },
  { label: 'Students', href: '/school-admin/students', icon: 'graduation-cap' },
  { label: 'Compliance', href: '/school-admin/compliance', icon: 'shield-check' },
  { label: 'Analytics', href: '/school-admin/analytics', icon: 'bar-chart' },
  { label: 'Audit Log', href: '/school-admin/audit-log', icon: 'file-search' },
  { label: 'Billing', href: '/school-admin/billing', icon: 'credit-card' },
] as const;

export const districtAdminNavItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: 'layout-dashboard' },
  { label: 'Schools', href: '/admin/schools', icon: 'building' },
  { label: 'Educators', href: '/admin/educators', icon: 'users' },
  { label: 'Compliance', href: '/admin/compliance', icon: 'shield-check' },
] as const;

export const adminNavItems = [
  { label: 'Super Admin Dashboard', href: '/admin/dashboard', icon: 'shield-check' },
  { label: 'Ingestion Control', href: '/admin/ingest', icon: 'shield-check' },
  { label: 'School Comparison', href: '/admin/school-comparison', icon: 'git-compare' },
  { label: 'State Reporting', href: '/admin/state-reporting', icon: 'file-bar-chart' },
  { label: 'SIS Import', href: '/admin/sis-import', icon: 'upload' },
] as const;
