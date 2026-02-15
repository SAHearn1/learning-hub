import { Badge } from '@/components/ui/badge';
import { StandardFramework, Subject } from '@prisma/client';
import * as Tooltip from '@radix-ui/react-tooltip';

const SUBJECT_COLORS: Record<Subject, string> = {
  MATH: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  SCIENCE: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  LANGUAGE_ARTS: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  FINANCIAL_LITERACY: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
};

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
