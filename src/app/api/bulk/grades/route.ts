import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

const bulkGradeSchema = z.object({
  grades: z.array(z.object({
    submissionId: z.string().min(1),
    score: z.number().min(0),
    maxScore: z.number().min(1),
    feedback: z.string().optional(),
  })).min(1),
});

export async function POST(req: Request) {
  const user = await requireRole(['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);
  const { grades } = bulkGradeSchema.parse(await req.json());

  const results = await Promise.all(
    grades.map(async (g) => {
      const percentage = (g.score / g.maxScore) * 100;
      const letterGrade =
        percentage >= 90 ? 'A' : percentage >= 80 ? 'B' :
        percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F';
      return db.grade.create({
        data: {
          tenantId: user.tenantId,
          submissionId: g.submissionId,
          score: g.score,
          maxScore: g.maxScore,
          percentage,
          letterGrade,
          feedback: g.feedback ?? null,
          gradedById: user.id,
        },
      });
    }),
  );

  return NextResponse.json({ data: results });
}
