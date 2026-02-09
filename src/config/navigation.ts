export const studentNavItems = [
  { label: 'Learn', href: '/learn', icon: 'book-open' },
  { label: 'Browse Curriculum', href: '/curriculum', icon: 'library' },
  { label: 'Financial Literacy', href: '/curriculum?subject=FINANCIAL_LITERACY', icon: 'banknote' },
  { label: 'Calm Corner', href: '/regulate', icon: 'heart' },
  { label: 'My Progress', href: '/progress', icon: 'bar-chart' },
  { label: 'Community', href: '/community', icon: 'users' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
] as const;

export const educatorNavItems = [
  { label: 'Students', href: '/educator/students', icon: 'users' },
  { label: 'Classes', href: '/educator/classes', icon: 'school' },
  { label: 'Reports', href: '/educator/reports', icon: 'file-text' },
  { label: 'Compliance', href: '/educator/compliance', icon: 'shield-check' },
] as const;

export const parentNavItems = [
  { label: 'Child Assessments', href: '/students/demo-student/assessments', icon: 'progress' },
  { label: 'Settings', href: '/parent/settings', icon: 'settings' },
] as const;

export const adminNavItems = [
  { label: 'Super Admin Dashboard', href: '/admin/dashboard', icon: 'shield-check' },
  { label: 'Ingestion Control', href: '/admin/ingest', icon: 'shield-check' },
] as const;
