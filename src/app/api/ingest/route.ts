import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api-handler';
import { UnauthorizedError, InternalServerError, BadRequestError } from '@/lib/api-errors';

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

export const POST = withApiHandler(async (req) => {
  const startTime = Date.now();

  // Verify webhook secret — always required, never allow bypass
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('N8N_WEBHOOK_SECRET is not configured — rejecting ingest request');
    throw new InternalServerError('Webhook not configured');
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${webhookSecret}`) {
    throw new UnauthorizedError('Invalid webhook secret');
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

    // Log failed ingestion attempt
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

    throw new BadRequestError(errorMessage);
  }

  // Create pending log entry
  const log = await db.ingestLog.create({
    data: {
      status: 'PROCESSING',
      source: payload.source,
      payload: payload as any,
      processedFiles: 0,
    },
  });

  try {
    // Process the ingestion
    const processedFiles = payload.files?.length || 0;
    
    // TODO: Implement actual file processing logic:
    // 1. Parse and extract content from curriculum files in payload.files
    // 2. Generate embeddings for each file's content using generateEmbedding()
    // 3. Upsert embeddings to Pinecone with metadata (file path, course, module, etc.)
    // 4. Update database records (Standards, Topics, etc.) if needed
    // 5. Track processed file count and any errors
    // For now, we just log the ingestion attempt
    
    // Update log with success
    await db.ingestLog.update({
      where: { id: log.id },
      data: {
        status: 'SUCCESS',
        processedFiles,
        durationMs: Date.now() - startTime,
        metadata: payload.metadata,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Ingestion completed successfully',
      logId: log.id,
      processedFiles,
      durationMs: Date.now() - startTime,
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during ingestion';

    // Update log with failure
    await db.ingestLog.update({
      where: { id: log.id },
      data: {
        status: 'FAILURE',
        errorMessage,
        durationMs: Date.now() - startTime,
      },
    });

    throw new InternalServerError(`Ingestion failed: ${errorMessage}`);
  }
});

export const GET = withApiHandler(async () => {
  return NextResponse.json({ status: 'ok' });
});
