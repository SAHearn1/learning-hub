import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

const studentRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  gradeLevel: z.number().int().min(1).max(12),
  externalId: z.string().optional(), // SIS ID
  parentEmail: z.string().email().optional(),
});

const importSchema = z.object({
  students: z.array(studentRowSchema).min(1).max(500),
  dryRun: z.boolean().optional().default(false),
});

export const POST = withApiHandler(async (req) => {
  const user = await requireRole(['DISTRICT_ADMIN', 'PLATFORM_ADMIN']);

  const body = importSchema.parse(await req.json());
  const { students, dryRun } = body;

  const results = {
    total: students.length,
    created: 0,
    skipped: 0,
    errors: [] as Array<{ row: number; email: string; reason: string }>,
  };

  if (dryRun) {
    // Validate only — check for existing emails
    const emails = students.map((s) => s.email);
    const existing = await db.user.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    });
    const existingEmails = new Set(existing.map((u) => u.email));

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      if (existingEmails.has(s.email)) {
        results.skipped++;
        results.errors.push({ row: i + 1, email: s.email, reason: 'Email already exists' });
      } else {
        results.created++;
      }
    }
    return NextResponse.json({ data: { dryRun: true, ...results } });
  }

  // Real import
  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    try {
      const existing = await db.user.findFirst({ where: { email: s.email } });
      if (existing) {
        results.skipped++;
        results.errors.push({ row: i + 1, email: s.email, reason: 'Email already exists' });
        continue;
      }

      // Create user + student profile in a transaction
      await db.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: s.email,
            firstName: s.firstName,
            lastName: s.lastName,
            role: 'STUDENT',
            tenantId: user.tenantId,
            // Placeholder Clerk ID until the student accepts an invite
            clerkUserId: `sis_import_${Date.now()}_${i}`,
            isMinor: s.gradeLevel <= 8,
            consentStatus: s.gradeLevel <= 8 ? 'PENDING' : undefined,
          },
        });

        await tx.student.create({
          data: {
            userId: newUser.id,
            gradeLevel: s.gradeLevel,
            learningPreferences: {},
            regulationProfile: {
              dysregulationTriggers: [],
              calmingStrategies: [],
              preferredBreakDuration: 5,
            },
          },
        });
      });

      results.created++;
    } catch (err) {
      logger.error('SIS import row error', { row: i + 1, email: s.email, error: err });
      results.errors.push({ row: i + 1, email: s.email, reason: 'Internal error' });
    }
  }

  return NextResponse.json({ data: results }, { status: 201 });
});
