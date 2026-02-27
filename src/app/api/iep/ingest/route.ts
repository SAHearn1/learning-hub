import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ingestIepDocument } from '@/lib/rag/iep-ingest-api';
import { appendImmutableAuditLog } from '@/lib/audit';
import { withApiHandler } from '@/lib/api-handler';
import { requireUser } from '@/lib/auth';
import { ForbiddenError, NotFoundError } from '@/lib/api-errors';

// =================================================================
// IEP Document Ingestion API
// POST /api/iep/ingest
// Requires EDUCATOR or SCHOOL_ADMIN role.
// =================================================================

const ingestRequestSchema = z.object({
  studentId: z.string().min(1, 'studentId is required'),
  content: z.string().min(10, 'IEP content must be at least 10 characters'),
  metadata: z.object({
    gradeLevel: z.number().int().min(0).max(12),
    school: z.string().min(1, 'school name is required'),
    caseManager: z.string().min(1, 'case manager name is required'),
    lastUpdated: z.string().datetime().optional(),
  }),
});

const ALLOWED_ROLES = ['EDUCATOR', 'SCHOOL_ADMIN', 'DISTRICT_ADMIN', 'PLATFORM_ADMIN'];

export const POST = withApiHandler(async (req: NextRequest) => {
  const user = await requireUser();

  if (!ALLOWED_ROLES.includes(user.role)) {
    throw new ForbiddenError('Requires EDUCATOR or SCHOOL_ADMIN role');
  }

  // withApiHandler catches ZodError automatically and returns 400
  const body = ingestRequestSchema.parse(await req.json());

  // Verify the student exists and belongs to the same tenant
  const student = await db.student.findUnique({
    where: { id: body.studentId },
    include: { user: { select: { tenantId: true } } },
  });

  if (!student) {
    throw new NotFoundError('Student not found');
  }

  if (student.user.tenantId !== user.tenantId) {
    throw new ForbiddenError('Student belongs to a different organization');
  }

  try {
    // Perform the ingestion
    const result = await ingestIepDocument(body.studentId, body.content, {
      gradeLevel: body.metadata.gradeLevel,
      school: body.metadata.school,
      caseManager: body.metadata.caseManager,
      lastUpdated: body.metadata.lastUpdated
        ? new Date(body.metadata.lastUpdated)
        : undefined,
    });

    // Log the action for FERPA compliance auditing
    await appendImmutableAuditLog({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'IEP_DOCUMENT_INGESTED',
      resource: 'IepDocument',
      resourceId: result.documentId,
      metadata: {
        studentId: body.studentId,
        chunksCreated: result.chunksCreated,
        processingTimeMs: result.processingTimeMs,
        sections: result.sections,
        gradeLevel: body.metadata.gradeLevel,
        school: body.metadata.school,
      },
      ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
    });

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      chunksCreated: result.chunksCreated,
      processingTimeMs: result.processingTimeMs,
      sections: result.sections,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown error during IEP ingestion';

    // Log the failed attempt before re-throwing so withApiHandler maps to 500
    await appendImmutableAuditLog({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'IEP_DOCUMENT_INGEST_FAILED',
      resource: 'IepDocument',
      metadata: {
        studentId: body.studentId,
        error: errorMessage,
      },
      ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
    });

    throw err;
  }
});
