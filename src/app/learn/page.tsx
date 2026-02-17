import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { LearnPageClient } from './learn-page-client';
import { SignInPrompt } from './sign-in-prompt';
import type { Subject } from '@prisma/client';

export interface PreselectedTopic {
  id: string;
  name: string;
  subject: 'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS' | 'FINANCIAL_LITERACY';
  description: string;
}

interface PageProps {
  searchParams: Promise<{ topic?: string; subject?: string }>;
}

export default async function LearnPage({ searchParams }: PageProps) {
  const { userId } = await auth();

  // If not signed in, show sign-in prompt
  if (!userId) {
    return <SignInPrompt />;
  }

  const { topic: topicId, subject } = await searchParams;

  const preselectedSubject: Subject | null =
    subject === 'MATH' ||
    subject === 'SCIENCE' ||
    subject === 'LANGUAGE_ARTS' ||
    subject === 'FINANCIAL_LITERACY'
      ? subject
      : null;

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

  return (
    <LearnPageClient
      preselectedTopic={preselectedTopic}
      preselectedSubject={preselectedSubject}
    />
  );
}
