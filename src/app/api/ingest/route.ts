import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  generateEmbeddings,
  chunkText,
  chunkMarkdown,
  chunkJSON,
} from '@/lib/embeddings';
import { upsertVectors, type CurriculumMetadata } from '@/lib/pinecone';
import { resolveNamespace } from '@/lib/pinecone-config';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const ingestPayloadSchema = z.object({
  source: z.enum(['WEBHOOK', 'MANUAL', 'SCHEDULED', 'API']).optional().default('WEBHOOK'),
  files: z.array(z.object({
    path: z.string(),
    content: z.string().optional(),
    documentType: z.enum(['md', 'json', 'txt', 'pdf']).optional(),
    subject: z.enum(['MATH', 'SCIENCE', 'LANGUAGE_ARTS']).optional(),
    gradeLevel: z.array(z.number().int().min(1).max(12)).optional().default([]),
    standardCodes: z.array(z.string()).optional().default([]),
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
    const files = payload.files ?? [];
    let totalVectorIds: string[] = [];
    let processedCount = 0;

    for (const file of files) {
      if (!file.content) {
        logger.debug('Skipping file without content', { path: file.path });
        continue;
      }

      // Determine document type from file extension if not specified
      const ext = file.documentType ?? file.path.split('.').pop()?.toLowerCase() ?? 'txt';
      const documentType = ['md', 'json', 'txt', 'pdf'].includes(ext) ? ext : 'txt';

      // 1. Chunk content based on document type
      let chunks: string[];
      switch (documentType) {
        case 'md':
          chunks = chunkMarkdown(file.content);
          break;
        case 'json':
          chunks = chunkJSON(file.content);
          break;
        case 'txt':
        case 'pdf':
          chunks = chunkText(file.content);
          break;
        default:
          chunks = chunkText(file.content);
      }

      if (chunks.length === 0) {
        logger.debug('No chunks produced', { path: file.path });
        continue;
      }

      logger.info('Document chunked', {
        path: file.path,
        documentType,
        chunkCount: chunks.length,
      });

      // 2. Generate embeddings for all chunks
      const embeddings = await generateEmbeddings(chunks);

      // 3. Prepare vectors with metadata
      const vectors = chunks.map((text, i) => {
        const vectorId = `${file.path.replace(/[^a-zA-Z0-9._-]/g, '_')}_chunk_${i}`;
        const metadata: CurriculumMetadata = {
          filename: file.path,
          documentType,
          subject: file.subject ?? '',
          gradeLevel: file.gradeLevel?.[0] ?? 0,
          standardCodes: file.standardCodes ?? [],
          chunkIndex: i,
          totalChunks: chunks.length,
          text: text.substring(0, 2000), // Pinecone metadata limit
        };

        return { id: vectorId, values: embeddings[i], metadata };
      });

      // 4. Route to the correct namespace and upsert
      const namespace = resolveNamespace(
        file.path,
        documentType,
        file.standardCodes ?? [],
      );
      const vectorIds = await upsertVectors(vectors, namespace);
      totalVectorIds.push(...vectorIds);
      processedCount++;

      logger.info('Vectors upserted to Pinecone', {
        path: file.path,
        namespace,
        vectorCount: vectorIds.length,
      });
    }

    // Update log with success
    await db.ingestLog.update({
      where: { id: log.id },
      data: {
        status: 'SUCCESS',
        processedFiles: processedCount,
        durationMs: Date.now() - startTime,
        metadata: {
          ...(payload.metadata ?? {}),
          vectorIds: totalVectorIds,
          totalChunks: totalVectorIds.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Ingestion completed successfully',
      logId: log.id,
      processedFiles: processedCount,
      vectorCount: totalVectorIds.length,
      durationMs: Date.now() - startTime,
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during ingestion';
    logger.error('Ingest failed', { error: errorMessage });

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
