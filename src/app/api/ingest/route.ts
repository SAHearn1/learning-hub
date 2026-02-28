import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseCurriculumFile } from '@/lib/curriculum/parser';
import { generateEmbeddings } from '@/lib/embeddings';
import { upsertVectors } from '@/lib/pinecone';

const ingestPayloadSchema = z.object({
  source: z.enum(['WEBHOOK', 'MANUAL', 'SCHEDULED', 'API']).optional().default('WEBHOOK'),
  files: z.array(z.object({ path: z.string(), content: z.string().optional(), metadata: z.record(z.any()).optional() })).optional(),
  metadata: z.record(z.any()).optional(),
  timestamp: z.string().optional(),
});

async function defaultFinancialLiteracyFiles() {
  const dir = path.join(process.cwd(), 'content', '14-financial-literacy');
  const entries = await fs.readdir(dir);
  return entries.filter((f) => f.endsWith('.md')).sort().map((f) => ({
    path: path.join('content', '14-financial-literacy', f),
    metadata: { subject: 'FINANCIAL_LITERACY', gradeLevel: [9, 10, 11, 12], gradeBand: 'HS' },
  }));
}

/**
 * Compute a stable SHA-256 content hash for an ingest payload.
 * The hash covers file paths + file content (if provided inline) so that
 * repeated calls with identical inputs can be skipped without re-embedding.
 */
async function computePayloadHash(
  files: { path: string; content?: string }[],
): Promise<string> {
  const parts: string[] = [];
  for (const f of files) {
    parts.push(f.path);
    if (typeof f.content === 'string') {
      parts.push(f.content);
    } else {
      // Read file content for hash computation only (not held in memory beyond this).
      try {
        const absPath = path.isAbsolute(f.path) ? f.path : path.join(process.cwd(), f.path);
        const content = await fs.readFile(absPath, 'utf8');
        parts.push(content);
      } catch {
        // If file is unreadable, include path only so hash is still stable per-call.
        parts.push(`<unreadable:${f.path}>`);
      }
    }
  }
  return crypto.createHash('sha256').update(parts.join('\0')).digest('hex');
}

/**
 * Constant-time string comparison to prevent timing-based secret enumeration.
 * Pads both inputs to the same length before comparing so length differences
 * don't cause an early exit that leaks information about the expected value.
 */
function timingSafeStringEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  const aBuf = Buffer.alloc(maxLen);
  const bBuf = Buffer.alloc(maxLen);
  Buffer.from(a).copy(aBuf);
  Buffer.from(b).copy(bBuf);
  return crypto.timingSafeEqual(aBuf, bBuf) && a.length === b.length;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });

  const authHeader = req.headers.get('authorization')?.trim() ?? '';
  const expectedBearer = `Bearer ${webhookSecret}`;
  if (!timingSafeStringEqual(authHeader, expectedBearer)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const payload = ingestPayloadSchema.parse(body);

  const config = await db.platformConfig.upsert({
    where: { key: 'default' },
    create: { key: 'default' },
    update: {},
  });

  if (!config.ingestionEnabled) {
    if (payload.source === 'MANUAL') {
      const user = await getCurrentUser();
      if (!user || user.role !== 'PLATFORM_ADMIN') {
        return NextResponse.json(
          {
            error: 'Ingestion disabled',
            message: 'Manual ingestion is restricted to platform admins while ingestion is disabled.',
            reason: config.ingestionReason,
            disabledAt: config.ingestionDisabledAt,
          },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error: 'Ingestion disabled',
          message: 'Curriculum ingestion is currently disabled by platform configuration.',
          reason: config.ingestionReason,
          disabledAt: config.ingestionDisabledAt,
        },
        { status: 503 }
      );
    }
  }
  const files = payload.files?.length ? payload.files : await defaultFinancialLiteracyFiles();

  // Idempotency: compute a SHA-256 hash of the payload file paths + content.
  // If an identical payload was successfully ingested recently, skip re-ingestion
  // to prevent duplicate Pinecone vectors and unnecessary OpenAI embedding costs.
  const contentHash = await computePayloadHash(files);
  const recentSuccess = await db.ingestLog.findFirst({
    where: { contentHash, status: 'SUCCESS' },
    orderBy: { createdAt: 'desc' },
  });
  if (recentSuccess) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'identical_payload',
      previousLogId: recentSuccess.id,
      processedFiles: 0,
      chunks: 0,
      vectors: 0,
    });
  }

  const log = await db.ingestLog.create({
    data: { status: 'PROCESSING', source: payload.source, contentHash, payload: payload as any, processedFiles: 0 },
  });

  try {
    const chunks = (await Promise.all(files.map((f) => parseCurriculumFile(f)))).flat();
    const embeddings = await generateEmbeddings(chunks.map((c) => c.text));
    const vectorIds = await upsertVectors(chunks.map((chunk, i) => ({ id: chunk.id, values: embeddings[i], metadata: chunk.metadata as any })));

    await db.ingestLog.update({ where: { id: log.id }, data: { status: 'SUCCESS', processedFiles: files.length, durationMs: Date.now() - startTime, metadata: { ...(payload.metadata || {}), chunks: chunks.length, vectors: vectorIds.length } } });
    return NextResponse.json({ success: true, processedFiles: files.length, chunks: chunks.length, vectors: vectorIds.length });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during ingestion';
    await db.ingestLog.update({ where: { id: log.id }, data: { status: 'FAILURE', errorMessage, durationMs: Date.now() - startTime } });
    return NextResponse.json({ error: 'Ingestion failed', message: errorMessage, logId: log.id }, { status: 500 });
  }
}

export async function GET() { return NextResponse.json({ status: 'ok' }); }
