import fs from 'node:fs/promises';
import path from 'node:path';

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
    sourcePath: string;
    sectionHeading?: string;
    documentType: 'curriculum';
    subject: string;
    gradeLevel: number | number[];
    gradeBand?: string;
    standardCodes: string[];
    chunkIndex: number;
    totalChunks: number;
    text: string;
    chapter?: string;
    title?: string;
    topics?: string[];
    sourceCollection?: string;
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

const FINANCIAL_LITERACY_SUBJECT = 'FINANCIAL_LITERACY';
const FINANCIAL_LITERACY_COLLECTION = '14-financial-literacy';
const CHUNK_MAX_CHARS = 1800;
const CHUNK_OVERLAP_CHARS = 200;

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

function inferSourceCollection(filePath: string, metadata: Record<string, unknown>): string | undefined {
  if (typeof metadata.sourceCollection === 'string' && metadata.sourceCollection.trim()) {
    return metadata.sourceCollection;
  }

  const normalized = normalizePath(filePath).toLowerCase();
  if (normalized.includes(FINANCIAL_LITERACY_COLLECTION)) {
    return FINANCIAL_LITERACY_COLLECTION;
  }

  return undefined;
}

function inferSubject(metadata: Record<string, unknown>, content: string, sourceCollection?: string): string {
  if (typeof metadata.subject === 'string' && metadata.subject.trim()) {
    return metadata.subject.toUpperCase();
  }

  if (sourceCollection === FINANCIAL_LITERACY_COLLECTION) {
    return FINANCIAL_LITERACY_SUBJECT;
  }

  const scan = content.toLowerCase();
  if (scan.includes('financial literacy')) return FINANCIAL_LITERACY_SUBJECT;
  if (scan.includes('mathematics') || scan.includes('math')) return 'MATH';
  if (scan.includes('science')) return 'SCIENCE';
  if (scan.includes('financial literacy') || scan.includes('budget') || scan.includes('invest')) return 'FINANCIAL_LITERACY';
  if (scan.includes('english language arts') || scan.includes('ela')) return 'LANGUAGE_ARTS';
  if (scan.includes('social studies')) return 'SOCIAL_STUDIES';
  return 'INTERDISCIPLINARY';
}

function inferChapter(filePath: string, metadata: Record<string, unknown>): string | undefined {
  if (typeof metadata.chapter === 'string' && metadata.chapter.trim()) {
    return metadata.chapter.toLowerCase();
  }

  const normalized = normalizePath(filePath);
  const chapterMatch = normalized.match(/ch(?:apter)?[-_ ]?(\d{1,2})/i);
  if (chapterMatch?.[1]) {
    return `ch${chapterMatch[1].padStart(2, '0')}`;
  }

  return undefined;
}

function inferGradeBand(metadata: Record<string, unknown>, subject: string): string | undefined {
  if (typeof metadata.gradeBand === 'string' && metadata.gradeBand.trim()) {
    return metadata.gradeBand;
  }

  if (subject === FINANCIAL_LITERACY_SUBJECT) {
    return 'HS';
  }

  return undefined;
}

function inferGradeLevelValue(filePath: string, metadata: Record<string, unknown>, subject: string): number | number[] {
  if (Array.isArray(metadata.gradeLevel)) {
    const levels = metadata.gradeLevel.filter((value): value is number => typeof value === 'number');
    if (levels.length > 0) return levels;
  }

  if (typeof metadata.gradeLevel === 'number') {
    return metadata.gradeLevel;
  }

  if (subject === FINANCIAL_LITERACY_SUBJECT) {
    return [9, 10, 11, 12];
  }

  return inferGradeLevel(filePath, 0);
}

function extractDocumentTitle(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return (match?.[1] ?? fallback).trim();
}

function extractTopics(content: string, metadata: Record<string, unknown>): string[] {
  if (Array.isArray(metadata.topics)) {
    return metadata.topics.filter((topic): topic is string => typeof topic === 'string' && topic.trim().length > 0);
  }

  const topicMatches = [...content.matchAll(/^###\s+(.+)$/gm)].map((m) => m[1].trim());
  return Array.from(new Set(topicMatches));
}

function splitMarkdownBySection(markdown: string): { sectionHeading?: string; body: string }[] {
  const lines = markdown.split('\n');
  const sections: { sectionHeading?: string; body: string }[] = [];
  let currentHeading: string | undefined;
  let currentBody: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^(##|###)\s+(.+)$/);
    if (headingMatch) {
      if (currentBody.join('\n').trim().length > 0) {
        sections.push({
          sectionHeading: currentHeading,
          body: currentBody.join('\n').trim(),
        });
      }
      currentHeading = headingMatch[2].trim();
      currentBody = [line];
      continue;
    }
    currentBody.push(line);
  }

  if (currentBody.join('\n').trim().length > 0) {
    sections.push({
      sectionHeading: currentHeading,
      body: currentBody.join('\n').trim(),
    });
  }

  return sections;
}

function takeOverlap(text: string): string {
  const tail = text.slice(-CHUNK_OVERLAP_CHARS);
  const firstNewline = tail.indexOf('\n');
  return firstNewline >= 0 ? tail.slice(firstNewline + 1).trim() : tail.trim();
}

function chunkSectionBody(body: string): string[] {
  if (body.length <= CHUNK_MAX_CHARS) {
    return [body.trim()];
  }

  const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > CHUNK_MAX_CHARS && current) {
      chunks.push(current.trim());
      const overlap = takeOverlap(current);
      current = overlap ? `${overlap}\n\n${paragraph}` : paragraph;
    } else if (candidate.length > CHUNK_MAX_CHARS) {
      let start = 0;
      while (start < paragraph.length) {
        const end = Math.min(start + CHUNK_MAX_CHARS, paragraph.length);
        const part = paragraph.slice(start, end).trim();
        if (part) {
          chunks.push(part);
        }
        if (end >= paragraph.length) break;
        start = Math.max(end - CHUNK_OVERLAP_CHARS, start + 1);
      }
      current = '';
    } else {
      current = candidate;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
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

  const sourcePath = normalizePath(file.path);
  const sourceCollection = inferSourceCollection(file.path, metadata);
  const subject = inferSubject(metadata, content, sourceCollection);
  const gradeBand = inferGradeBand(metadata, subject);
  const gradeLevel = inferGradeLevelValue(file.path, metadata, subject);
  const standardCodes = Array.isArray(metadata.standardCodes)
    ? metadata.standardCodes.filter((code): code is string => typeof code === 'string')
    : [];

  const inferred = inferCourseAndModule(file.path);
  const course = typeof metadata.course === 'string' ? metadata.course : inferred.course;
  const moduleName = typeof metadata.module === 'string' ? metadata.module : inferred.module;

  const title = typeof metadata.title === 'string'
    ? metadata.title
    : extractDocumentTitle(content, moduleName ?? path.basename(file.path));
  const chapter = inferChapter(file.path, metadata);
  const topics = extractTopics(content, metadata);

  const sections = file.path.endsWith('.md')
    ? splitMarkdownBySection(content)
    : [{ sectionHeading: undefined, body: content }];

  const chunkBodies = sections.flatMap((section) =>
    chunkSectionBody(section.body).map((chunkText) => ({
      sectionHeading: section.sectionHeading,
      chunkText,
    })),
  );

  // Guardrail: skip near-empty chunks during ingestion embedding flow.
  const eligibleChunks = chunkBodies.filter((chunk) => chunk.chunkText.trim().length >= 50);
  if (eligibleChunks.length === 0) {
    return [];
  }

  const cleanPath = sourcePath.replace(/[^a-zA-Z0-9-_]/g, '-');

  return eligibleChunks.map((chunk, index) => {
    const id = sourceCollection === FINANCIAL_LITERACY_COLLECTION && chapter
      ? `finlit-${chapter}-${String(index).padStart(4, '0')}`
      : `${cleanPath}-chunk-${index}`;

    return {
      id,
      text: chunk.chunkText,
      metadata: {
        filename: file.path,
        sourcePath,
        ...(chunk.sectionHeading ? { sectionHeading: chunk.sectionHeading } : {}),
        documentType: 'curriculum',
        subject,
        gradeLevel,
        ...(gradeBand ? { gradeBand } : {}),
        standardCodes,
        chunkIndex: index,
        totalChunks: eligibleChunks.length,
        text: chunk.chunkText,
        ...(chapter ? { chapter } : {}),
        ...(title ? { title } : {}),
        ...(topics.length ? { topics } : {}),
        ...(sourceCollection ? { sourceCollection } : {}),
        ...(course ? { course } : {}),
        ...(moduleName ? { module: moduleName } : {}),
      },
    };
  });
}
