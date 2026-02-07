import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

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
  
  // Verify webhook secret
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
  const authHeader = req.headers.get('authorization');
  
  if (webhookSecret) {
    const expectedAuth = `Bearer ${webhookSecret}`;
    if (authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid webhook secret' },
        { status: 401 }
      );
    }
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

    return NextResponse.json(
      { error: 'Validation error', message: errorMessage },
      { status: 400 }
    );
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
    
    // Here you would process the files, update embeddings, etc.
    // For now, we'll just log the ingestion
    
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

    return NextResponse.json(
      { error: 'Ingestion failed', message: errorMessage, logId: log.id },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Health check endpoint
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/ingest',
    methods: ['POST'],
  });
}
