import { Badge } from '@/components/ui/badge';
import { StandardFramework, Subject } from '@prisma/client';
import * as Tooltip from '@radix-ui/react-tooltip';

const SUBJECT_COLORS = {
  MATH: 'bg-subject-math-light text-subject-math-dark border-subject-math/20 hover:bg-subject-math-light/80',
  SCIENCE: 'bg-subject-science-light text-subject-science-dark border-subject-science/20 hover:bg-subject-science-light/80',
  LANGUAGE_ARTS: 'bg-subject-ela-light text-subject-ela-dark border-subject-ela/20 hover:bg-subject-ela-light/80',
} as const;

interface StandardBadgeProps {
  code: string;
  framework: StandardFramework;
  subject: Subject;
  description?: string;
  className?: string;
}

export function StandardBadge({ code, framework, subject, description, className }: StandardBadgeProps) {
  const badge = (
    <Badge 
      variant="outline" 
      className={`${SUBJECT_COLORS[subject]} font-mono text-xs ${className || ''}`}
    >
      {code}
    </Badge>
  );

  if (!description) {
    return badge;
  }

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {badge}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content 
            className="max-w-sm rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white shadow-lg"
            sideOffset={5}
          >
            <p className="font-semibold">{code}</p>
            <p className="mt-1 text-neutral-200">{description}</p>
            <Tooltip.Arrow className="fill-neutral-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
