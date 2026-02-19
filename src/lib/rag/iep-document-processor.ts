// =================================================================
// IEP Document Processor
// Splits IEP documents into semantic chunks for vector storage
// =================================================================

import type { IepDocument, IepSection, IepSectionType, IepChunk } from './types';

/**
 * Maximum chunk size in tokens (approximated as chars / 4).
 * Each chunk will contain at most this many estimated tokens.
 */
const MAX_CHUNK_TOKENS = 1000;
const MAX_CHUNK_CHARS = MAX_CHUNK_TOKENS * 4; // ~4000 chars

/**
 * Overlap between adjacent chunks in tokens.
 * This ensures context continuity across chunk boundaries.
 */
const OVERLAP_TOKENS = 100;
const OVERLAP_CHARS = OVERLAP_TOKENS * 4; // ~400 chars

/**
 * Well-known IEP section header patterns used to detect sections
 * in raw IEP document text. Each pattern maps to an IepSectionType.
 */
const SECTION_PATTERNS: { pattern: RegExp; type: IepSectionType }[] = [
  // Anchor patterns to the start of the line to avoid matching phrases inside
  // normal sentences (IEP content often mentions e.g. "current levels").
  { pattern: /^present\s+levels?\b/i, type: 'present_levels' },
  { pattern: /^present\s+performance\b/i, type: 'present_levels' },
  { pattern: /^current\s+level\b/i, type: 'present_levels' },
  { pattern: /^annual\s+goals?\b/i, type: 'annual_goals' },
  { pattern: /^measurable\s+annual\s+goals?\b/i, type: 'annual_goals' },
  { pattern: /^short[- ]term\s+objectives?\b/i, type: 'short_term_objectives' },
  { pattern: /^benchmarks?\b/i, type: 'short_term_objectives' },
  { pattern: /^accommodations?\b/i, type: 'accommodations' },
  { pattern: /^supplementary\s+aids?\b/i, type: 'accommodations' },
  { pattern: /^modifications?\b/i, type: 'modifications' },
  { pattern: /^program\s+modifications?\b/i, type: 'modifications' },
  { pattern: /^related\s+services?\b/i, type: 'related_services' },
  { pattern: /^special\s+education\s+services?\b/i, type: 'related_services' },
  { pattern: /^transition\s+plans?\b/i, type: 'transition_plan' },
  { pattern: /^transition\s+services?\b/i, type: 'transition_plan' },
  { pattern: /^post[- ]secondary\b/i, type: 'transition_plan' },
  { pattern: /^behavior\s+(intervention\s+)?plans?\b/i, type: 'behavior_plan' },
  { pattern: /^behavioral\s+supports?\b/i, type: 'behavior_plan' },
  { pattern: /^assessment\s+accommodations?\b/i, type: 'assessment_accommodations' },
  { pattern: /^testing\s+accommodations?\b/i, type: 'assessment_accommodations' },
  { pattern: /^state\s+assessments?\b/i, type: 'assessment_accommodations' },
];

/**
 * Known accommodation type keywords that map to AccommodationType enum values.
 * Used to tag chunks with specific accommodation types for filtered retrieval.
 */
const ACCOMMODATION_KEYWORDS: Record<string, string> = {
  'extended time': 'EXTENDED_TIME',
  'extra time': 'EXTENDED_TIME',
  'time and a half': 'EXTENDED_TIME',
  'reduced stimuli': 'REDUCED_STIMULI',
  'minimal distractions': 'REDUCED_STIMULI',
  'separate setting': 'REDUCED_STIMULI',
  'simplified': 'SIMPLIFIED_MODE',
  'simplified mode': 'SIMPLIFIED_MODE',
  'text to speech': 'TEXT_TO_SPEECH',
  'text-to-speech': 'TEXT_TO_SPEECH',
  'read aloud': 'TEXT_TO_SPEECH',
  'frequent breaks': 'FREQUENT_BREAKS',
  'break schedule': 'FREQUENT_BREAKS',
  'movement breaks': 'FREQUENT_BREAKS',
  'chunked content': 'CHUNKED_CONTENT',
  'chunked': 'CHUNKED_CONTENT',
  'smaller segments': 'CHUNKED_CONTENT',
  'modified difficulty': 'MODIFIED_DIFFICULTY',
  'modified grade': 'MODIFIED_DIFFICULTY',
  'reduced complexity': 'MODIFIED_DIFFICULTY',
  'visual supports': 'VISUAL_SUPPORTS',
  'visual aids': 'VISUAL_SUPPORTS',
  'graphic organizer': 'VISUAL_SUPPORTS',
  'audio supports': 'AUDIO_SUPPORTS',
  'audio recording': 'AUDIO_SUPPORTS',
  'alternative assessment': 'ALTERNATIVE_ASSESSMENT',
  'alternate assessment': 'ALTERNATIVE_ASSESSMENT',
  'portfolio assessment': 'ALTERNATIVE_ASSESSMENT',
};

/**
 * Processes a structured IEP document into semantic chunks suitable
 * for embedding and vector storage.
 *
 * @param document - The IEP document with pre-parsed sections
 * @returns An array of IEP chunks ready for embedding
 */
export function processIepDocument(document: IepDocument): IepChunk[] {
  const allChunks: IepChunk[] = [];

  for (const section of document.sections) {
    const sectionChunks = chunkSection(section, document);
    allChunks.push(...sectionChunks);
  }

  // Assign global chunk indices and totals
  const totalChunks = allChunks.length;
  return allChunks.map((chunk, index) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      chunkIndex: index,
      totalChunks,
    },
  }));
}

/**
 * Parses raw IEP text into structured sections by detecting
 * section header patterns. This is useful when ingesting
 * unstructured IEP document text.
 *
 * @param rawContent - Raw text content of an IEP document
 * @returns Parsed array of IepSection objects
 */
export function parseIepSections(rawContent: string): IepSection[] {
  const lines = rawContent.split('\n');
  const sections: IepSection[] = [];
  let currentSection: IepSection | null = null;
  let contentBuffer: string[] = [];

  for (const line of lines) {
    const detectedType = detectSectionType(line);

    if (detectedType && line.trim().length < 200) {
      // This line looks like a section header
      if (currentSection) {
        currentSection.content = contentBuffer.join('\n').trim();
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
      }

      currentSection = {
        type: detectedType,
        title: line.trim(),
        content: '',
      };
      contentBuffer = [];
    } else {
      contentBuffer.push(line);
    }
  }

  // Flush the final section
  if (currentSection) {
    currentSection.content = contentBuffer.join('\n').trim();
    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }
  }

  // If no sections were detected, treat entire content as a general section
  if (sections.length === 0 && rawContent.trim().length > 0) {
    sections.push({
      type: 'general',
      title: 'IEP Document',
      content: rawContent.trim(),
    });
  }

  return sections;
}

/**
 * Splits a single IEP section into chunks that respect the token limit,
 * with overlap for context continuity between adjacent chunks.
 */
function chunkSection(section: IepSection, document: IepDocument): IepChunk[] {
  const { content, type } = section;
  const chunks: IepChunk[] = [];

  // Detect accommodation type if this is an accommodations section
  const accommodationType = detectAccommodationType(content);

  // Section header prefix included in every chunk for context
  const headerPrefix = `[${formatSectionType(type)}] ${section.title}\n\n`;
  const headerChars = headerPrefix.length;
  const availableChars = MAX_CHUNK_CHARS - headerChars;

  if (content.length <= availableChars) {
    // Content fits in a single chunk
    chunks.push(
      createChunk(
        headerPrefix + content,
        type,
        document,
        0,
        accommodationType,
      ),
    );
  } else {
    // Split content into multiple chunks with overlap
    const paragraphs = splitIntoParagraphs(content);
    let currentChunkContent = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const candidateContent = currentChunkContent
        ? currentChunkContent + '\n\n' + paragraph
        : paragraph;

      if (candidateContent.length > availableChars && currentChunkContent.length > 0) {
        // Current chunk is full; save it and start a new one with overlap
        chunks.push(
          createChunk(
            headerPrefix + currentChunkContent,
            type,
            document,
            chunkIndex,
            accommodationType,
          ),
        );
        chunkIndex++;

        // Calculate overlap: take trailing characters from the previous chunk
        const overlapText = extractOverlap(currentChunkContent, OVERLAP_CHARS);
        currentChunkContent = overlapText + '\n\n' + paragraph;
      } else if (paragraph.length > availableChars) {
        // Single paragraph exceeds max chunk size; force-split it
        if (currentChunkContent.length > 0) {
          chunks.push(
            createChunk(
              headerPrefix + currentChunkContent,
              type,
              document,
              chunkIndex,
              accommodationType,
            ),
          );
          chunkIndex++;
          currentChunkContent = '';
        }

        const forceSplitChunks = forceSplitText(paragraph, availableChars, OVERLAP_CHARS);
        for (const splitContent of forceSplitChunks) {
          chunks.push(
            createChunk(
              headerPrefix + splitContent,
              type,
              document,
              chunkIndex,
              accommodationType,
            ),
          );
          chunkIndex++;
        }
      } else {
        currentChunkContent = candidateContent;
      }
    }

    // Flush remaining content
    if (currentChunkContent.trim().length > 0) {
      chunks.push(
        createChunk(
          headerPrefix + currentChunkContent,
          type,
          document,
          chunkIndex,
          accommodationType,
        ),
      );
    }
  }

  return chunks;
}

/**
 * Creates a single IepChunk with proper ID and metadata.
 */
function createChunk(
  content: string,
  sectionType: IepSectionType,
  document: IepDocument,
  chunkIndex: number,
  accommodationType?: string,
): IepChunk {
  const id = `iep_${document.studentId}_${document.documentId}_${sectionType}_${chunkIndex}`;

  return {
    id,
    content,
    sectionType,
    metadata: {
      studentId: document.studentId,
      documentId: document.documentId,
      sectionType,
      chunkIndex,
      totalChunks: 0, // Will be set by processIepDocument after all chunks are created
      gradeLevel: document.metadata.gradeLevel,
      lastUpdated: document.metadata.lastUpdated.toISOString(),
      ...(accommodationType ? { accommodationType } : {}),
    },
  };
}

/**
 * Detects IEP section type from a line of text by matching against
 * known section header patterns.
 */
function detectSectionType(line: string): IepSectionType | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) return null;

  // Normalize whitespace (including NBSP) so header detection is robust against
  // copy/pasted document content.
  const normalized = trimmed.replace(/[\s\u00A0]+/g, ' ').trim();
  // Strip a few common invisible "format" characters that can sneak in when
  // copying text from PDFs/Word.
  const cleaned = normalized.replace(/[\uFEFF\u200E\u200F\u202A-\u202E]/g, '');
  // Some copy/paste sources include leading bullets/markers or zero-width chars.
  const canonical = cleaned.replace(/^[^A-Za-z0-9]+/, '');
  // Normalize compatibility forms (e.g., fullwidth Latin characters) so simple
  // ASCII patterns still match copy/pasted text.
  const compat = canonical.normalize('NFKC');

  // Fast-path for common headers. This intentionally overlaps with regex patterns
  // below, but avoids any regex edge cases and keeps behavior obvious.
  const lower = compat.toLowerCase();
  if (lower.startsWith('current level')) return 'present_levels';
  if (lower.startsWith('present level') || lower.startsWith('present levels'))
    return 'present_levels';
  if (lower.startsWith('annual goal') || lower.startsWith('annual goals'))
    return 'annual_goals';
  if (
    lower.startsWith('assessment accommodation') ||
    lower.startsWith('assessment accommodations')
  )
    return 'assessment_accommodations';

  for (const { pattern, type } of SECTION_PATTERNS) {
    if (pattern.test(compat)) {
      return type;
    }
  }

  return null;
}

/**
 * Detects accommodation type keywords within chunk content.
 * Returns the first matched AccommodationType enum value or undefined.
 */
function detectAccommodationType(content: string): string | undefined {
  const lowerContent = content.toLowerCase();

  for (const [keyword, type] of Object.entries(ACCOMMODATION_KEYWORDS)) {
    if (lowerContent.includes(keyword)) {
      return type;
    }
  }

  return undefined;
}

/**
 * Splits text into paragraphs (by double newline or single newline boundaries).
 */
function splitIntoParagraphs(text: string): string[] {
  // Split on double newlines first
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  if (paragraphs.length > 1) {
    return paragraphs.map((p) => p.trim());
  }

  // Fall back to single newline splits if no double-newline breaks
  return text.split('\n').filter((p) => p.trim().length > 0).map((p) => p.trim());
}

/**
 * Extracts overlap text from the tail end of a chunk.
 * Tries to break at sentence boundaries for cleaner overlap.
 */
function extractOverlap(text: string, overlapChars: number): string {
  if (text.length <= overlapChars) return text;

  const tail = text.slice(-overlapChars);

  // Try to find a sentence boundary in the overlap region
  const sentenceBreak = tail.search(/[.!?]\s+/);
  if (sentenceBreak !== -1 && sentenceBreak < tail.length * 0.5) {
    return tail.slice(sentenceBreak + 1).trim();
  }

  // Fall back to word boundary
  const wordBreak = tail.indexOf(' ');
  if (wordBreak !== -1) {
    return tail.slice(wordBreak + 1).trim();
  }

  return tail.trim();
}

/**
 * Force-splits a single large text block that exceeds the max chunk size.
 * Splits at sentence or word boundaries with overlap.
 */
function forceSplitText(
  text: string,
  maxChars: number,
  overlapChars: number,
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);

    // If not at the end, try to break at a sentence or word boundary
    if (end < text.length) {
      const segment = text.slice(start, end);
      const lastSentence = segment.lastIndexOf('. ');
      const lastSpace = segment.lastIndexOf(' ');

      if (lastSentence > maxChars * 0.5) {
        end = start + lastSentence + 1;
      } else if (lastSpace > maxChars * 0.5) {
        end = start + lastSpace;
      }
    }

    chunks.push(text.slice(start, end).trim());

    // If we reached the end, don't apply overlap math (can stall when remaining
    // text length is <= overlapChars).
    if (end >= text.length) break;

    // Move start forward, accounting for overlap
    start = end - overlapChars;
    if (start <= (end - maxChars) || start < 0) {
      start = end; // Prevent infinite loops
    }
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Formats a section type into a human-readable label for chunk content headers.
 */
function formatSectionType(type: IepSectionType): string {
  const labels: Record<IepSectionType, string> = {
    present_levels: 'Present Levels of Performance',
    annual_goals: 'Annual Goals',
    short_term_objectives: 'Short-Term Objectives',
    accommodations: 'Accommodations',
    modifications: 'Modifications',
    related_services: 'Related Services',
    transition_plan: 'Transition Plan',
    behavior_plan: 'Behavior Intervention Plan',
    assessment_accommodations: 'Assessment Accommodations',
    general: 'General',
  };

  return labels[type] || 'General';
}

/**
 * Estimates token count for a string (approximation: 1 token ~ 4 chars).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
