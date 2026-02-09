import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
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

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
  if (!webhookSecret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  if (req.headers.get('authorization') !== `Bearer ${webhookSecret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const payload = ingestPayloadSchema.parse(body);
  const log = await db.ingestLog.create({ data: { status: 'PROCESSING', source: payload.source, payload: payload as any, processedFiles: 0 } });

  try {
    const files = payload.files?.length ? payload.files : await defaultFinancialLiteracyFiles();
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
});

export async function GET() { return NextResponse.json({ status: 'ok' }); }
