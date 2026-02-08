import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { generateEmbeddings } from '@/lib/embeddings';
import { upsertVectors } from '@/lib/pinecone';
import { logger } from '@/lib/logger';
import { withApiHandler } from '@/lib/api-handler';
import { AuthenticationError, ValidationError } from '@/lib/api-errors';
import { parseCurriculumFile } from '@/lib/curriculum/parser';

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

export const POST = withApiHandler(async (req, ctx) => {
  const startTime = Date.now();

  // Verify webhook secret — always required, never allow bypass
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('N8N_WEBHOOK_SECRET is not configured');
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${webhookSecret}`) {
    throw new AuthenticationError();
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

    throw new ValidationError(errorMessage);
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
    let processedFiles = 0;
    let failedFiles = 0;
    const errors: string[] = [];
    
    logger.info('Starting file ingestion', {
      source: payload.source,
      fileCount: payload.files?.length || 0,
      logId: log.id,
    });
    
    // Process files if provided
    if (payload.files && payload.files.length > 0) {
      // Process files in batches to avoid timeouts
      const BATCH_SIZE = 10;
      
      for (let batchStart = 0; batchStart < payload.files.length; batchStart += BATCH_SIZE) {
        const batchFiles = payload.files.slice(batchStart, batchStart + BATCH_SIZE);
        
        logger.debug('Processing file batch', {
          batchStart,
          batchSize: batchFiles.length,
          totalFiles: payload.files.length,
        });
        
        // Process each file in the batch
        for (const file of batchFiles) {
          try {
            const parsedChunks = await parseCurriculumFile(file);

            if (parsedChunks.length === 0) {
              logger.warn('No chunks generated for file', { path: file.path });
              failedFiles++;
              errors.push(`${file.path}: No chunks generated`);
              continue;
            }
            
            logger.debug('Generated chunks for file', {
              path: file.path,
              chunkCount: parsedChunks.length,
            });
            
            // Generate embeddings for all chunks
            const embeddings = await generateEmbeddings(parsedChunks.map((chunk) => chunk.text));
            
            if (embeddings.length !== parsedChunks.length) {
              throw new Error(`Embedding count mismatch: ${embeddings.length} vs ${parsedChunks.length}`);
            }
            
            // Prepare vectors for Pinecone with comprehensive metadata
            const vectors = parsedChunks.map((chunk, i) => {
              return {
                id: chunk.id,
                values: embeddings[i],
                metadata: chunk.metadata,
              };
            });
            
            // Upsert to Pinecone
            await upsertVectors(vectors);
            
            logger.info('Successfully processed file', {
              path: file.path,
              chunks: parsedChunks.length,
              vectorIds: vectors.length,
            });
            
            processedFiles++;
            
          } catch (fileError) {
            const errorMsg = fileError instanceof Error 
              ? fileError.message 
              : 'Unknown error';
            logger.error('Failed to process file', fileError, { path: file.path });
            failedFiles++;
            errors.push(`${file.path}: ${errorMsg}`);
          }
        }
        
        // Update progress incrementally
        await db.ingestLog.update({
          where: { id: log.id },
          data: {
            processedFiles: processedFiles,
            metadata: {
              ...payload.metadata,
              progress: {
                processed: processedFiles,
                failed: failedFiles,
                total: payload.files.length,
              },
            },
          },
        });
      }
    }
    
    // Determine final status
    // SUCCESS: All files processed successfully (no failures)
    // FAILURE: All files failed (no successes)
    // SUCCESS: Partial success (some files succeeded, some failed) - treat as success
    const status = processedFiles === 0 ? 'FAILURE' : 'SUCCESS';
    
    const finalErrorMessage = errors.length > 0 
      ? `Processed ${processedFiles} files successfully, ${failedFiles} failed. Errors: ${errors.join('; ')}`
      : undefined;
    
    logger.info('Ingestion completed', {
      status,
      processedFiles,
      failedFiles,
      totalFiles: payload.files?.length || 0,
    });
    
    // Update log with final results
    await db.ingestLog.update({
      where: { id: log.id },
      data: {
        status,
        processedFiles,
        durationMs: Date.now() - startTime,
        errorMessage: finalErrorMessage,
        metadata: {
          ...payload.metadata,
          finalResults: {
            processed: processedFiles,
            failed: failedFiles,
            total: payload.files?.length || 0,
            errors: errors,
          },
        },
      },
    });

    return NextResponse.json({
      success: status !== 'FAILURE',
      message: status === 'SUCCESS' 
        ? 'Ingestion completed successfully'
        : 'Ingestion completed with errors',
      logId: log.id,
      processedFiles,
      failedFiles,
      durationMs: Date.now() - startTime,
      errors: errors.length > 0 ? errors : undefined,
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

    throw err;
  }
}, { rateLimit: { windowMs: 60_000, max: 10 } });

export const GET = withApiHandler(async (req, ctx) => {
  return NextResponse.json({ status: 'ok' });
}, { rateLimit: { windowMs: 60_000, max: 60 } });
