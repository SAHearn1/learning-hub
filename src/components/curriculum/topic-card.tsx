import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubjectBadge } from './subject-badge';
import { StandardBadge } from './standard-badge';
import { MasteryIndicator } from './mastery-indicator';
import { Subject, StandardFramework } from '@prisma/client';
import { Clock } from 'lucide-react';

interface TopicCardProps {
  topic: {
    id: string;
    name: string;
    subject: Subject;
    gradeLevel: number[];
    description: string;
    estimatedDuration: number;
    standards: {
      code: string;
      framework: StandardFramework;
      subject: Subject;
    }[];
  };
  userProgress?: {
    masteryLevel: number;
  } | null;
}

export function TopicCard({ topic, userProgress }: TopicCardProps) {
  const gradeLevelText = topic.gradeLevel.length === 1 
    ? `Grade ${topic.gradeLevel[0]}`
    : `Grades ${Math.min(...topic.gradeLevel)}-${Math.max(...topic.gradeLevel)}`;

  return (
    <Link href={`/curriculum/topic/${topic.id}`}>
      <Card className="group h-full transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer">
        <CardHeader className="pb-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <SubjectBadge subject={topic.subject} />
            <span className="text-xs text-neutral-500">{gradeLevelText}</span>
          </div>
          <CardTitle className="text-lg leading-tight group-hover:text-primary-600 transition-colors">
            {topic.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-neutral-600 line-clamp-2">
            {topic.description}
          </p>

          {/* Standards */}
          {topic.standards.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {topic.standards.slice(0, 3).map((standard) => (
                <StandardBadge
                  key={standard.code}
                  code={standard.code}
                  framework={standard.framework}
                  subject={standard.subject}
                />
              ))}
              {topic.standards.length > 3 && (
                <span className="text-xs text-neutral-500 self-center">
                  +{topic.standards.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Duration */}
          <div className="flex items-center gap-1 text-xs text-neutral-500 mb-3">
            <Clock className="h-3 w-3" />
            <span>{topic.estimatedDuration} min</span>
          </div>

          {/* Progress */}
          {userProgress && (
            <MasteryIndicator 
              masteryLevel={userProgress.masteryLevel} 
              size="sm"
              showLabel={true}
            />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
