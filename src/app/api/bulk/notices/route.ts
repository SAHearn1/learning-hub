import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

const bulkSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1),
  trigger: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await requireRole(['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN']);
  const { studentIds, trigger } = bulkSchema.parse(await req.json());

  const results = await Promise.allSettled(
    studentIds.map(async (studentId) => {
      const res = await fetch(new URL('/api/safeguards/issue', req.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, trigger }),
      });
      return { studentId, status: res.status };
    }),
  );

  return NextResponse.json({
    data: results.map((r, i) => ({
      studentId: studentIds[i],
      success: r.status === 'fulfilled',
    })),
  });
}
