import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { parseCurriculumFile } from '@/lib/curriculum/parser';
import { generateEmbeddings } from '@/lib/embeddings';
import { upsertVectors } from '@/lib/pinecone';

const subjectEnum = z.enum(['MATH', 'SCIENCE', 'LANGUAGE_ARTS', 'ELA', 'SOCIAL_STUDIES', 'INTERDISCIPLINARY', 'FINANCIAL_LITERACY']);

const ingestMetadataSchema = z.object({
  subject: subjectEnum.optional(),
  gradeLevel: z.array(z.number()).or(z.number()).optional(),
  gradeBand: z.string().optional(),
  sourceCollection: z.string().optional(),
  chapter: z.string().optional(),
  title: z.string().optional(),
  topics: z.array(z.string()).optional(),
}).passthrough();

const ingestPayloadSchema = z.object({
  source: z.enum(['WEBHOOK', 'MANUAL', 'SCHEDULED', 'API']).optional().default('WEBHOOK'),
  files: z.array(z.object({
    path: z.string(),
    content: z.string().optional(),
    metadata: ingestMetadataSchema.optional(),
  })).optional(),
  metadata: ingestMetadataSchema.optional(),
  timestamp: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('N8N_WEBHOOK_SECRET is not configured — rejecting ingest request');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${webhookSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  let body;
  let payload: z.infer<typeof ingestPayloadSchema>;

  try {
    body = await req.json();
    payload = ingestPayloadSchema.parse(body);
  } catch (err) {
    const errorMessage = err instanceof z.ZodError
      ? err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      : err instanceof Error ? err.message : 'Invalid request payload';

    await db.ingestLog.create({
      data: {
        status: 'FAILURE',
        source: 'WEBHOOK',
        payload: body as any,
        errorMessage,
        processedFiles: 0,
        durationMs: Date.now() - startTime,
      },
    });

    return NextResponse.json(
      { error: 'Validation error', message: errorMessage },
      { status: 400 }
    );
  }

  const log = await db.ingestLog.create({
    data: {
      status: 'PROCESSING',
      source: payload.source,
      payload: payload as any,
      processedFiles: 0,
    },
  });

  try {
    const files = payload.files ?? [];
    const allChunks = [];

    for (const file of files) {
      const mergedMetadata = { ...(payload.metadata ?? {}), ...(file.metadata ?? {}) };
      const chunks = await parseCurriculumFile({
        path: file.path,
        content: file.content,
        metadata: mergedMetadata,
      });
      allChunks.push(...chunks);
    }

    if (allChunks.length > 0) {
      const embeddings = await generateEmbeddings(allChunks.map((chunk) => chunk.text));

      const vectors = allChunks.map((chunk, i) => ({
        id: chunk.id,
        values: embeddings[i],
        metadata: chunk.metadata,
      }));

      const preferredNamespace = allChunks.find(
        (chunk) => chunk.metadata.sourceCollection === '14-financial-literacy',
      )
        ? '14-financial-literacy'
        : undefined;

      if (preferredNamespace) {
        await upsertVectors(vectors, { namespace: preferredNamespace });
      } else {
        await upsertVectors(vectors);
      }
    }

    await db.ingestLog.update({
      where: { id: log.id },
      data: {
        status: 'SUCCESS',
        processedFiles: files.length,
        durationMs: Date.now() - startTime,
        metadata: {
          ...(payload.metadata ?? {}),
          chunksUpserted: allChunks.length,
        } as any,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Ingestion completed successfully',
      logId: log.id,
      processedFiles: files.length,
      chunksUpserted: allChunks.length,
      durationMs: Date.now() - startTime,
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during ingestion';

    await db.ingestLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILURE',
        errorMessage,
        durationMs: Date.now() - startTime,
      },
    });

    return NextResponse.json(
      { error: 'Ingestion failed', message: errorMessage, logId: log.id },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
