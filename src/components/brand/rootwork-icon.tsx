import { BookOpen, Compass, GraduationCap, ShieldCheck, Sprout, Users } from 'lucide-react';

const iconClass = 'h-5 w-5';

const iconMap: Record<string, JSX.Element> = {
  learn: <BookOpen className={iconClass} aria-hidden />,
  progress: <Compass className={iconClass} aria-hidden />,
  regulate: <ShieldCheck className={iconClass} aria-hidden />,
  methodology: <Sprout className={iconClass} aria-hidden />,
  community: <Users className={iconClass} aria-hidden />,
  educator: <GraduationCap className={iconClass} aria-hidden />,
  parent: <Users className={iconClass} aria-hidden />,
  admin: <ShieldCheck className={iconClass} aria-hidden />,
};

export function RootworkIcon({ href, label }: { href: string; label: string }) {
  const key = `${href} ${label}`.toLowerCase();
  const icon = Object.entries(iconMap).find(([token]) => key.includes(token))?.[1];

  return icon ?? <Sprout className={iconClass} aria-hidden />;
}
