import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ingestIepDocument } from '@/lib/rag/iep-ingest-api';
import { appendImmutableAuditLog } from '@/lib/audit';

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

export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Look up user and verify role
  const user = await db.user.findUnique({
    where: { clerkUserId: clerkId },
  });

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden: requires EDUCATOR or SCHOOL_ADMIN role' },
      { status: 403 },
    );
  }

  // Validate request body
  let body: z.infer<typeof ingestRequestSchema>;
  try {
    const raw = await req.json();
    body = ingestRequestSchema.parse(raw);
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
        : 'Invalid request payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Verify the student exists and belongs to the same tenant
  const student = await db.student.findUnique({
    where: { id: body.studentId },
    include: { user: { select: { tenantId: true } } },
  });

  if (!student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  if (student.user.tenantId !== user.tenantId) {
    return NextResponse.json(
      { error: 'Forbidden: student belongs to a different organization' },
      { status: 403 },
    );
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

    console.error('IEP ingestion failed:', errorMessage);

    // Log the failed attempt
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

    return NextResponse.json(
      { error: 'IEP ingestion failed', message: errorMessage },
      { status: 500 },
    );
  }
}
