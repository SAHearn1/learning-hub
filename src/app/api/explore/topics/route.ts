import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { NotFoundError } from '@/lib/api-errors';
import { calculateTopicMastery, determineMasteryStatus } from '@/lib/assessments/progress-calculator';

const subjectEnum = z.enum(['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY']);

/**
 * GET /api/explore/topics?subject=MATH
 * Returns topics for a subject sorted by mastery (weakest first).
 */
export const GET = withApiHandler(async (req) => {
  const user = await requireUser();

  if (!user.student) {
    throw new NotFoundError('Student profile not found');
  }

  const subjectParam = req.nextUrl.searchParams.get('subject');
  const subject = subjectEnum.parse(subjectParam);

  // Fetch topics for this subject
  const topics = await db.topic.findMany({
    where: { subject },
    select: {
      id: true,
      name: true,
      description: true,
      gradeLevel: true,
      estimatedDuration: true,
      standards: { select: { id: true, code: true, description: true } },
    },
    orderBy: { name: 'asc' },
  });

  // Calculate mastery for each topic
  const topicsWithMastery = await Promise.all(
    topics.map(async (topic) => {
      try {
        const { overallMastery } = await calculateTopicMastery(user.student!.id, topic.id);
        const status = determineMasteryStatus(overallMastery);
        return {
          ...topic,
          mastery: overallMastery,
          masteryStatus: status.status,
          masteryColor: status.color,
          masteryDescription: status.description,
        };
      } catch {
        return {
          ...topic,
          mastery: 0,
          masteryStatus: 'NOT_STARTED' as const,
          masteryColor: 'gray',
          masteryDescription: 'Not yet assessed',
        };
      }
    }),
  );

  // Sort by mastery ascending (weakest first)
  topicsWithMastery.sort((a, b) => a.mastery - b.mastery);

  return NextResponse.json({ data: topicsWithMastery });
});
