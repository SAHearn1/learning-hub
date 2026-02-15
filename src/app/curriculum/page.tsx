import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { CurriculumClient } from './curriculum-client';

async function getCurriculumData() {
  // Get all topics with their standards
  const topics = await db.topic.findMany({
    include: {
      standards: {
        select: {
          code: true,
          framework: true,
          subject: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Try to get user progress if logged in
  const { userId: clerkId } = await auth();
  let userProgress: { topicId: string; masteryLevel: number }[] = [];

  if (clerkId) {
    const user = await db.user.findUnique({
      where: { clerkUserId: clerkId },
      include: { student: true },
    });

    if (user?.student) {
      // Get progress for all standards
      const progressEntries = await db.progress.findMany({
        where: { studentId: user.student.id },
        include: {
          standard: {
            include: {
              topics: {
                select: { id: true },
              },
            },
          },
        },
      });

      // Calculate average mastery per topic
      const topicMasteryMap = new Map<string, { sum: number; count: number }>();
      
      progressEntries.forEach((progress) => {
        progress.standard.topics.forEach((topic) => {
          const current = topicMasteryMap.get(topic.id) || { sum: 0, count: 0 };
          topicMasteryMap.set(topic.id, {
            sum: current.sum + progress.masteryLevel,
            count: current.count + 1,
          });
        });
      });

      userProgress = Array.from(topicMasteryMap.entries()).map(([topicId, data]) => ({
        topicId,
        masteryLevel: data.sum / data.count,
      }));
    }
  }

  return { topics, userProgress };
}

export default async function CurriculumPage() {
  const { topics, userProgress } = await getCurriculumData();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <CurriculumClient topics={topics} userProgress={userProgress} />
    </div>
  );
}
