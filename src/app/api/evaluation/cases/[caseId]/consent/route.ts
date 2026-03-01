import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { requireRole } from '@/lib/auth';
import { recordConsent } from '@/lib/evaluation/evaluation.service';

const CONSENT_TYPES = ['INITIAL_EVALUATION', 'REEVALUATION', 'SERVICES', 'RELEASE_OF_RECORDS'] as const;
const DECISIONS = ['GRANTED', 'REFUSED', 'REVOKED'] as const;

const createSchema = z.object({
  consentType: z.enum(CONSENT_TYPES),
  decision: z.enum(DECISIONS),
  respondentName: z.string().min(1),
  consentDate: z.string().min(1),
  notes: z.string().optional(),
});

export const POST = withApiHandler(async (req, ctx) => {
  const user = await requireRole(['PARENT']);

  const body = createSchema.parse(await req.json());

  const consent = await recordConsent({
    caseId: ctx.params.caseId,
    consentType: body.consentType,
    decision: body.decision,
    respondentId: user.id,
    respondentName: body.respondentName,
    consentDate: body.consentDate,
    notes: body.notes,
    userId: user.id,
  });

  return NextResponse.json({ data: consent }, { status: 201 });
});
