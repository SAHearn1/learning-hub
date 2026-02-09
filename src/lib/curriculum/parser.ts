import fs from 'node:fs/promises';
import path from 'node:path';
import { chunkMarkdown, chunkText } from '@/lib/embeddings';

export interface CurriculumFileInput {
  path: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface ParsedCurriculumChunk {
  id: string;
  text: string;
  metadata: {
    filename: string;
    documentType: 'curriculum';
    subject: string;
    gradeLevel: number;
    standardCodes: string[];
    chunkIndex: number;
    totalChunks: number;
    text: string;
    course?: string;
    module?: string;
  };
}

const GRADE_MAP: Record<string, number> = {
  'K-2': 1,
  '3-5': 4,
  '6-8': 7,
  '9-12': 10,
};

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function inferGradeLevel(filePath: string, fallback?: number): number {
  const normalized = normalizePath(filePath);
  const match = normalized.match(/(?:grade-bands|04-grade-bands)\/(K-2|3-5|6-8|9-12)/i);
  if (match?.[1]) {
    return GRADE_MAP[match[1]] ?? fallback ?? 0;
  }
  return fallback ?? 0;
}

function inferCourseAndModule(filePath: string): { course?: string; module?: string } {
  const parts = normalizePath(filePath).split('/').filter(Boolean);
  const course = parts.length >= 2 ? parts[parts.length - 2] : undefined;
  const moduleFile = parts.at(-1);
  const moduleName = moduleFile?.replace(/\.md$/i, '');
  return { course, module: moduleName };
}

function inferSubject(metadata: Record<string, unknown>, content: string): string {
  if (typeof metadata.subject === 'string' && metadata.subject.trim()) {
    return metadata.subject.toUpperCase();
  }

  const scan = content.toLowerCase();
  if (scan.includes('mathematics') || scan.includes('math')) return 'MATH';
  if (scan.includes('science')) return 'SCIENCE';
  if (scan.includes('english language arts') || scan.includes('ela')) return 'ELA';
  if (scan.includes('social studies')) return 'SOCIAL_STUDIES';
  return 'INTERDISCIPLINARY';
}

async function resolveContent(file: CurriculumFileInput): Promise<string> {
  if (typeof file.content === 'string') {
    return file.content;
  }

  const repoRoot = process.cwd();
  const absolutePath = path.isAbsolute(file.path)
    ? file.path
    : path.join(repoRoot, file.path);
  return fs.readFile(absolutePath, 'utf8');
}

export async function parseCurriculumFile(
  file: CurriculumFileInput,
): Promise<ParsedCurriculumChunk[]> {
  const content = (await resolveContent(file)).trim();
  const metadata = file.metadata ?? {};

  if (!content) {
    return [];
  }

  const subject = inferSubject(metadata, content);
  const gradeLevel = inferGradeLevel(file.path, typeof metadata.gradeLevel === 'number' ? metadata.gradeLevel : 0);
  const standardCodes = Array.isArray(metadata.standardCodes)
    ? metadata.standardCodes.filter((code): code is string => typeof code === 'string')
    : [];

  const inferred = inferCourseAndModule(file.path);
  const course = typeof metadata.course === 'string' ? metadata.course : inferred.course;
  const moduleName = typeof metadata.module === 'string' ? metadata.module : inferred.module;

  const chunks = file.path.endsWith('.md')
    ? chunkMarkdown(content, 512)
    : chunkText(content, 512, 50);

  // Guardrail: skip near-empty chunks during ingestion embedding flow.
  const eligibleChunks = chunks.filter(chunk => chunk.trim().length >= 50);
  if (eligibleChunks.length === 0) {
    return [];
  }

  const cleanPath = file.path.replace(/[^a-zA-Z0-9-_]/g, '-');

  return eligibleChunks.map((chunk, index) => ({
    id: `${cleanPath}-chunk-${index}`,
    text: chunk,
    metadata: {
      filename: file.path,
      documentType: 'curriculum',
      subject,
      gradeLevel,
      standardCodes,
      chunkIndex: index,
      totalChunks: eligibleChunks.length,
      text: chunk,
      ...(course ? { course } : {}),
      ...(moduleName ? { module: moduleName } : {}),
    },
  }));
}
