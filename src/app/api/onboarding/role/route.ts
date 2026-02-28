import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { AuthenticationError, ValidationError } from '@/lib/api-errors';

const USER_INCLUDE = {
  student: true,
  educator: true,
  parent: true,
};

const roleSchema = z.object({
  role: z.enum(['STUDENT', 'EDUCATOR', 'PARENT']),
  gradeLevel: z.number().int().min(1).max(12).optional(),
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new AuthenticationError();

  const body = roleSchema.parse(await req.json());

  const user = await db.user.findUnique({
    where: { clerkUserId },
    include: USER_INCLUDE,
  });

  if (!user) {
    throw new ValidationError('User record not found. Please try signing in again.');
  }

  // Update role in DB
  await db.user.update({
    where: { id: user.id },
    data: { role: body.role },
  });

  // Create role-specific profile if it doesn't exist
  if (body.role === 'STUDENT' && !user.student) {
    await db.student.create({
      data: {
        userId: user.id,
        gradeLevel: body.gradeLevel ?? 6,
        learningPreferences: {},
        regulationProfile: {
          dysregulationTriggers: [],
          calmingStrategies: [],
          preferredBreakDuration: 5,
        },
      },
    });
  } else if (body.role === 'EDUCATOR' && !user.educator) {
    await db.educator.create({
      data: {
        userId: user.id,
        certifications: [],
        specializations: [],
      },
    });
  } else if (body.role === 'PARENT' && !user.parent) {
    await db.parent.create({
      data: {
        userId: user.id,
        childrenIds: [],
        communicationPrefs: {
          emailNotifications: true,
          smsNotifications: false,
        },
      },
    });
  }

  // Set role in Clerk metadata so we know onboarding is complete
  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(clerkUserId, {
    publicMetadata: { role: body.role, onboardingComplete: true },
  });

  return NextResponse.json({ data: { role: body.role } });
}, { rateLimit: { windowMs: 60_000, max: 5 } });
