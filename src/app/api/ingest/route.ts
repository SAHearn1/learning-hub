import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { parseCurriculumFile } from '@/lib/curriculum/parser';
import { generateEmbeddings } from '@/lib/embeddings';
import { upsertVectors } from '@/lib/pinecone';

const ingestPayloadSchema = z.object({
  source: z.enum(['WEBHOOK', 'MANUAL', 'SCHEDULED', 'API']).optional().default('WEBHOOK'),
  files: z.array(z.object({
    path: z.string(),
    content: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  })).optional(),
  metadata: z.record(z.any()).optional(),
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
    const files = payload.files || [];
    let processedFiles = 0;
    let failedFiles = 0;
    const errors: Array<{ path: string; error: string }> = [];

    for (const file of files) {
      try {
        const parsedChunks = await parseCurriculumFile(file);
        if (parsedChunks.length === 0) {
          processedFiles += 1;
          continue;
        }

        const embeddings = await generateEmbeddings(parsedChunks.map(chunk => chunk.text));

        await upsertVectors(parsedChunks.map((chunk, idx) => ({
          id: chunk.id,
          values: embeddings[idx],
          metadata: chunk.metadata,
        })));

        processedFiles += 1;
      } catch (err) {
        failedFiles += 1;
        errors.push({
          path: file.path,
          error: err instanceof Error ? err.message : 'Unknown file processing error',
        });
      }

      await db.ingestLog.update({
        where: { id: log.id },
        data: {
          processedFiles,
          metadata: {
            ...(payload.metadata || {}),
            failedFiles,
          },
        },
      });
    }

    await db.ingestLog.update({
      where: { id: log.id },
      data: {
        status: failedFiles > 0 && processedFiles === 0 ? 'FAILURE' : 'SUCCESS',
        processedFiles,
        durationMs: Date.now() - startTime,
        errorMessage: errors.length > 0 ? JSON.stringify(errors) : null,
        metadata: {
          ...(payload.metadata || {}),
          failedFiles,
          errors,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Ingestion completed successfully',
      logId: log.id,
      processedFiles,
      failedFiles,
      errors,
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
