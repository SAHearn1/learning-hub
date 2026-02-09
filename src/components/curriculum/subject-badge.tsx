import { Badge } from '@/components/ui/badge';
import { Subject } from '@prisma/client';

const SUBJECT_COLORS = {
  MATH: 'bg-blue-100 text-blue-800 border-blue-200',
  SCIENCE: 'bg-green-100 text-green-800 border-green-200',
  LANGUAGE_ARTS: 'bg-purple-100 text-purple-800 border-purple-200',
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
