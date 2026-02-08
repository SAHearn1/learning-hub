import { Badge } from '@/components/ui/badge';
import { Subject } from '@prisma/client';

const SUBJECT_COLORS = {
  MATH: 'bg-subject-math-light text-subject-math-dark border-subject-math/20',
  SCIENCE: 'bg-subject-science-light text-subject-science-dark border-subject-science/20',
  LANGUAGE_ARTS: 'bg-subject-ela-light text-subject-ela-dark border-subject-ela/20',
} as const;

const SUBJECT_LABELS = {
  MATH: 'Math',
  SCIENCE: 'Science',
  LANGUAGE_ARTS: 'Language Arts',
} as const;

interface SubjectBadgeProps {
  subject: Subject;
  className?: string;
}

export function SubjectBadge({ subject, className }: SubjectBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={`${SUBJECT_COLORS[subject]} ${className || ''}`}
    >
      {SUBJECT_LABELS[subject]}
    </Badge>
  );
}
