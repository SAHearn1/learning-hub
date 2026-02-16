import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ForbiddenError } from '@/lib/api-errors';
import { appendImmutableAuditLog } from '@/lib/audit';

const subjectEnum = z.enum(['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'FINANCIAL_LITERACY']);
const paceEnum = z.enum(['GUIDED', 'INDEPENDENT', 'CHALLENGE']);

const settingsPatchSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  learningPreferences: z.object({
    preferredSubjects: z.array(subjectEnum).max(4).default([]),
    pace: paceEnum.default('GUIDED'),
    accessibility: z.object({
      textToSpeech: z.boolean().default(false),
      dyslexicFont: z.boolean().default(false),
      highContrast: z.boolean().default(false),
    }).default({}),
  }).optional(),
  regulationProfile: z.object({
    calmingStrategies: z.array(z.string().min(1).max(120)).max(8).default([]),
    preferredBreakDuration: z.number().int().min(1).max(30).default(5),
  }).optional(),
});

type StudentSettingsPayload = {
  firstName: string;
  lastName: string;
  learningPreferences: {
    preferredSubjects: Array<'MATH' | 'SCIENCE' | 'LANGUAGE_ARTS' | 'FINANCIAL_LITERACY'>;
    pace: 'GUIDED' | 'INDEPENDENT' | 'CHALLENGE';
    accessibility: {
      textToSpeech: boolean;
      dyslexicFont: boolean;
      highContrast: boolean;
    };
  };
  regulationProfile: {
    calmingStrategies: string[];
    preferredBreakDuration: number;
  };
};

function normalizeSettings(user: {
  firstName: string;
  lastName: string;
  student: {
    learningPreferences: unknown;
    regulationProfile: unknown;
  };
}): StudentSettingsPayload {
  const learningPrefs = user.student.learningPreferences as Record<string, unknown> | null;
  const accessibility = learningPrefs?.accessibility as Record<string, unknown> | null;
  const regulationProfile = user.student.regulationProfile as Record<string, unknown> | null;

  const preferredSubjectsRaw = Array.isArray(learningPrefs?.preferredSubjects)
    ? learningPrefs.preferredSubjects
    : [];
  const preferredSubjects = preferredSubjectsRaw.filter((item): item is StudentSettingsPayload['learningPreferences']['preferredSubjects'][number] =>
    item === 'MATH' || item === 'SCIENCE' || item === 'LANGUAGE_ARTS' || item === 'FINANCIAL_LITERACY',
  );

  const pace =
    learningPrefs?.pace === 'INDEPENDENT' || learningPrefs?.pace === 'CHALLENGE'
      ? learningPrefs.pace
      : 'GUIDED';

  const calmingStrategiesRaw = Array.isArray(regulationProfile?.calmingStrategies)
    ? regulationProfile.calmingStrategies
    : [];
  const calmingStrategies = calmingStrategiesRaw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);

  const preferredBreakDurationRaw = regulationProfile?.preferredBreakDuration;
  const preferredBreakDuration =
    typeof preferredBreakDurationRaw === 'number' && Number.isFinite(preferredBreakDurationRaw)
      ? Math.max(1, Math.min(30, Math.round(preferredBreakDurationRaw)))
      : 5;

  return {
    firstName: user.firstName,
    lastName: user.lastName,
    learningPreferences: {
      preferredSubjects,
      pace,
      accessibility: {
        textToSpeech: Boolean(accessibility?.textToSpeech),
        dyslexicFont: Boolean(accessibility?.dyslexicFont),
        highContrast: Boolean(accessibility?.highContrast),
      },
    },
    regulationProfile: {
      calmingStrategies,
      preferredBreakDuration,
    },
  };
}

export const GET = withApiHandler(async () => {
  const user = await requireUser();

  if (user.role !== 'STUDENT' || !user.student) {
    throw new ForbiddenError('Student profile not found');
  }

  return NextResponse.json({
    data: normalizeSettings({
      firstName: user.firstName,
      lastName: user.lastName,
      student: {
        learningPreferences: user.student.learningPreferences,
        regulationProfile: user.student.regulationProfile,
      },
    }),
  });
});

export const PATCH = withApiHandler(async (req) => {
  const user = await requireUser();

  if (user.role !== 'STUDENT' || !user.student) {
    throw new ForbiddenError('Student profile not found');
  }

  const body = settingsPatchSchema.parse(await req.json());

  if (body.firstName || body.lastName) {
    await db.user.update({
      where: { id: user.id },
      data: {
        ...(body.firstName ? { firstName: body.firstName.trim() } : {}),
        ...(body.lastName ? { lastName: body.lastName.trim() } : {}),
      },
    });
  }

  if (body.learningPreferences || body.regulationProfile) {
    const currentLearningPreferences = user.student.learningPreferences as Record<string, unknown> | null;
    const currentRegulationProfile = user.student.regulationProfile as Record<string, unknown> | null;

    await db.student.update({
      where: { id: user.student.id },
      data: {
        ...(body.learningPreferences
          ? {
              learningPreferences: {
                ...currentLearningPreferences,
                ...body.learningPreferences,
                accessibility: {
                  ...(currentLearningPreferences?.accessibility as Record<string, unknown> | null),
                  ...(body.learningPreferences.accessibility ?? {}),
                },
              },
            }
          : {}),
        ...(body.regulationProfile
          ? {
              regulationProfile: {
                ...currentRegulationProfile,
                ...body.regulationProfile,
              },
            }
          : {}),
      },
    });
  }

  const refreshedUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      tenantId: true,
      firstName: true,
      lastName: true,
      student: {
        select: {
          id: true,
          learningPreferences: true,
          regulationProfile: true,
        },
      },
    },
  });

  if (!refreshedUser?.student) {
    throw new ForbiddenError('Student profile not found');
  }

  await appendImmutableAuditLog({
    tenantId: refreshedUser.tenantId,
    userId: refreshedUser.id,
    action: 'STUDENT_SETTINGS_UPDATED',
    resource: 'STUDENT_SETTINGS',
    resourceId: refreshedUser.student.id,
    metadata: {
      updatedFields: Object.keys(body),
    },
  });

  return NextResponse.json({
    data: normalizeSettings({
      firstName: refreshedUser.firstName,
      lastName: refreshedUser.lastName,
      student: {
        learningPreferences: refreshedUser.student.learningPreferences,
        regulationProfile: refreshedUser.student.regulationProfile,
      },
    }),
  });
});
