export const studentNavItems = [
  { label: 'Learn', href: '/learn', icon: 'book-open' },
  { label: 'Calm Corner', href: '/regulate', icon: 'heart' },
  { label: 'My Progress', href: '/progress', icon: 'bar-chart' },
  { label: 'Community', href: '/community', icon: 'users' },
  { label: 'Settings', href: '/settings', icon: 'settings' },
] as const;

export const educatorNavItems = [
  { label: 'Dashboard', href: '/educator/dashboard', icon: 'layout-dashboard' },
  { label: 'Students', href: '/educator/students', icon: 'users' },
  { label: 'Classes', href: '/educator/classes', icon: 'school' },
  { label: 'Reports', href: '/educator/reports', icon: 'file-text' },
  { label: 'Compliance', href: '/educator/compliance', icon: 'shield-check' },
] as const;

export const parentNavItems = [
  { label: 'Dashboard', href: '/parent/dashboard', icon: 'home' },
  { label: 'Settings', href: '/parent/settings', icon: 'settings' },
] as const;

export const adminNavItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: 'layout-dashboard' },
] as const;
