import { db } from '@/lib/db';
import { LearnPageClient } from './learn-page-client';

export interface PreselectedTopic {
  id: string;
  name: string;
  subject: 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS' | 'FINANCIAL_LITERACY';
  description: string;
}

interface PageProps {
  searchParams: Promise<{ topic?: string }>;
}

export default async function LearnPage({ searchParams }: PageProps) {
  const { topic: topicId } = await searchParams;

  let preselectedTopic: PreselectedTopic | null = null;

  if (topicId) {
    const topic = await db.topic.findUnique({
      where: { id: topicId },
      select: {
        id: true,
        name: true,
        subject: true,
        description: true,
      },
    });

    if (topic) {
      preselectedTopic = topic;
    }
  }

  return <LearnPageClient preselectedTopic={preselectedTopic} />;
}
