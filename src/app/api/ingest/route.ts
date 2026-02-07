import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import {
  generateEmbeddings,
  chunkText,
  chunkMarkdown,
  chunkJSON,
} from '@/lib/embeddings';
import { upsertVectors, type CurriculumMetadata } from '@/lib/pinecone';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

const ingestSchema = z.object({
  filename: z.string().min(1),
  content: z.string().min(1),
  documentType: z.enum(['md', 'json', 'txt', 'pdf']),
  subject: z.enum(['MATH', 'SCIENCE', 'LANGUAGE_ARTS']).optional(),
  gradeLevel: z.array(z.number().int().min(1).max(12)).optional().default([]),
  standardCodes: z.array(z.string()).optional().default([]),
  tenantId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Authenticate via webhook secret (n8n) or Clerk session (admin).
 * Returns tenantId if authenticated, null otherwise.
 */
function authenticateRequest(req: NextRequest): { authenticated: boolean; tenantId: string } {
  // Check webhook secret first (for n8n / automated pipelines)
  const webhookSecret = req.headers.get('x-webhook-secret');
  if (webhookSecret && webhookSecret === process.env.N8N_WEBHOOK_SECRET) {
    return { authenticated: true, tenantId: 'system' };
  }

  // Fall back to Clerk authentication
  const { userId } = auth();
  if (userId) {
    return { authenticated: true, tenantId: 'system' };
  }

  return { authenticated: false, tenantId: '' };
}

export async function POST(req: NextRequest) {
  const authResult = authenticateRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof ingestSchema>;
  try {
    body = ingestSchema.parse(await req.json());
  } catch (err) {
    const message = err instanceof z.ZodError
      ? err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      : 'Invalid request body';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const tenantId = body.tenantId || authResult.tenantId;

  // Create ingest log entry
  const ingestLog = await db.ingestLog.create({
    data: {
      tenantId,
      filename: body.filename,
      documentType: body.documentType,
      subject: body.subject,
      gradeLevel: body.gradeLevel,
      standardCodes: body.standardCodes,
      status: 'PROCESSING',
      metadata: (body.metadata as Prisma.InputJsonValue) ?? undefined,
    },
  });

  try {
    // 1. Parse and chunk the content based on document type
    let chunks: string[];
    switch (body.documentType) {
      case 'md':
        chunks = chunkMarkdown(body.content);
        break;
      case 'json':
        chunks = chunkJSON(body.content);
        break;
      case 'txt':
      case 'pdf':
        // PDF text should be pre-extracted by the client before sending
        chunks = chunkText(body.content);
        break;
      default:
        chunks = chunkText(body.content);
    }

    logger.info('Document chunked', {
      filename: body.filename,
      documentType: body.documentType,
      chunkCount: chunks.length,
    });

    if (chunks.length === 0) {
      await db.ingestLog.update({
        where: { id: ingestLog.id },
        data: { status: 'FAILED', errorMessage: 'No content to ingest after chunking' },
      });
      return NextResponse.json({ error: 'No content to ingest' }, { status: 400 });
    }

    // 2. Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(chunks);

    logger.info('Embeddings generated', {
      filename: body.filename,
      embeddingCount: embeddings.length,
    });

    // 3. Prepare vectors with metadata
    const vectors = chunks.map((text, i) => {
      const vectorId = `${body.filename.replace(/[^a-zA-Z0-9._-]/g, '_')}_chunk_${i}`;
      const metadata: CurriculumMetadata = {
        filename: body.filename,
        documentType: body.documentType,
        subject: body.subject ?? '',
        gradeLevel: body.gradeLevel?.[0] ?? 0,
        standardCodes: body.standardCodes ?? [],
        chunkIndex: i,
        totalChunks: chunks.length,
        text: text.substring(0, 2000), // Pinecone metadata limit
      };

      return {
        id: vectorId,
        values: embeddings[i],
        metadata,
      };
    });

    // 4. Upsert to Pinecone
    const vectorIds = await upsertVectors(vectors);

    logger.info('Vectors upserted to Pinecone', {
      filename: body.filename,
      vectorCount: vectorIds.length,
    });

    // 5. Update ingest log with success
    await db.ingestLog.update({
      where: { id: ingestLog.id },
      data: {
        status: 'COMPLETED',
        chunkCount: chunks.length,
        vectorIds,
      },
    });

    return NextResponse.json({
      success: true,
      ingestId: ingestLog.id,
      filename: body.filename,
      chunkCount: chunks.length,
      vectorIds,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during ingestion';
    logger.error('Ingest failed', { filename: body.filename, error: errorMessage });

    await db.ingestLog.update({
      where: { id: ingestLog.id },
      data: { status: 'FAILED', errorMessage },
    });

    return NextResponse.json(
      { error: 'Ingestion failed', details: errorMessage },
      { status: 500 },
    );
  }
}

/**
 * GET /api/ingest — List recent ingest logs (admin only)
 */
export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logs = await db.ingestLog.findMany({
    orderBy: { processedAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ logs });
}
