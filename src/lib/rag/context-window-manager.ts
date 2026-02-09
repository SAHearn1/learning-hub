// =================================================================
// Context Window Manager
// Manages token budget allocation across IEP context, curriculum
// context, and session history to build an optimized prompt context.
// =================================================================

import { generateEmbedding } from '@/lib/pinecone/embeddings';
import { queryPinecone } from '@/lib/pinecone/client';
import { queryIepContext, queryIepContextBySection } from './iep-vector-store';
import { estimateTokens } from './iep-document-processor';
import type {
  ContextBuildParams,
  OptimizedContext,
  IepContextResult,
  IepSectionType,
} from './types';

/**
 * Default maximum total tokens for the context window.
 */
const DEFAULT_MAX_TOKENS = 8000;

/**
 * Token budget allocation ratios.
 * These determine how much of the context window each section can occupy.
 */
const BUDGET_ALLOCATION = {
  iep: 0.4, // 40% for IEP context
  curriculum: 0.35, // 35% for curriculum context
  sessionHistory: 0.25, // 25% for session history
} as const;

/**
 * Priority ordering for IEP section types.
 * Higher priority sections are included first when budget is limited.
 * Active accommodations are most critical for instructional adaptation.
 */
const IEP_SECTION_PRIORITY: Record<IepSectionType, number> = {
  accommodations: 1, // Highest priority: active accommodations
  assessment_accommodations: 2,
  annual_goals: 3,
  short_term_objectives: 4,
  behavior_plan: 5,
  present_levels: 6,
  modifications: 7,
  related_services: 8,
  transition_plan: 9,
  general: 10, // Lowest priority
};

/**
 * Builds an optimized context window within the specified token budget.
 * Allocates tokens across IEP context, curriculum context, and session
 * history according to predefined ratios, with priority-based selection
 * of IEP sections.
 *
 * @param params - Context building parameters including student info,
 *   query, and session state
 * @returns An OptimizedContext with delineated sections and usage metrics
 */
export async function buildOptimizedContext(
  params: ContextBuildParams,
): Promise<OptimizedContext> {
  const maxTokens = params.maxTokens ?? DEFAULT_MAX_TOKENS;
  const retrievalStart = Date.now();

  // Calculate token budgets for each section
  const iepBudget = Math.floor(maxTokens * BUDGET_ALLOCATION.iep);
  const curriculumBudget = Math.floor(maxTokens * BUDGET_ALLOCATION.curriculum);
  const sessionBudget = Math.floor(maxTokens * BUDGET_ALLOCATION.sessionHistory);

  // Retrieve all context in parallel
  const [iepResults, curriculumResults] = await Promise.all([
    retrieveIepContext(params.studentId, params.query, params.accommodations),
    retrieveCurriculumContext(params.query, params.subject, params.gradeLevel),
  ]);

  const retrievalTimeMs = Date.now() - retrievalStart;

  // Build each section within its budget
  const iepContext = buildIepSection(iepResults, iepBudget);
  const curriculumContext = buildCurriculumSection(curriculumResults, curriculumBudget);
  const sessionSummary = buildSessionSection(params.sessionHistory, sessionBudget);

  // Calculate actual token usage
  const iepTokens = estimateTokens(iepContext);
  const curriculumTokens = estimateTokens(curriculumContext);
  const sessionTokens = estimateTokens(sessionSummary);

  return {
    iepContext,
    curriculumContext,
    sessionSummary,
    totalTokensUsed: iepTokens + curriculumTokens + sessionTokens,
    tokenBreakdown: {
      iep: iepTokens,
      curriculum: curriculumTokens,
      sessionHistory: sessionTokens,
    },
    retrievalMetrics: {
      iepChunksRetrieved: iepResults.length,
      curriculumChunksRetrieved: curriculumResults.length,
      retrievalTimeMs,
    },
  };
}

/**
 * Retrieves relevant IEP context for a student.
 * Performs a two-phase retrieval:
 * 1. High-priority sections (accommodations, goals) via filtered query
 * 2. General relevance query to fill remaining slots
 */
async function retrieveIepContext(
  studentId: string,
  query: string,
  accommodations: string[],
): Promise<IepContextResult[]> {
  try {
    // Phase 1: Retrieve high-priority IEP sections (accommodations + goals)
    const highPrioritySections: IepSectionType[] = [
      'accommodations',
      'assessment_accommodations',
      'annual_goals',
      'behavior_plan',
    ];

    const [priorityResults, generalResults] = await Promise.all([
      queryIepContextBySection(studentId, query, highPrioritySections, 5),
      queryIepContext(studentId, query, 8),
    ]);

    // Merge results, deduplicating by content
    const seen = new Set<string>();
    const merged: IepContextResult[] = [];

    // Priority results come first
    for (const result of priorityResults) {
      const key = result.content.slice(0, 100);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(result);
      }
    }

    // Then general results fill in gaps
    for (const result of generalResults) {
      const key = result.content.slice(0, 100);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(result);
      }
    }

    // Sort by priority then relevance
    merged.sort((a, b) => {
      const priorityDiff =
        (IEP_SECTION_PRIORITY[a.sectionType] ?? 10) -
        (IEP_SECTION_PRIORITY[b.sectionType] ?? 10);
      if (priorityDiff !== 0) return priorityDiff;
      return b.relevanceScore - a.relevanceScore;
    });

    return merged;
  } catch (error) {
    console.error('Error retrieving IEP context:', error);
    return [];
  }
}

/**
 * Retrieves relevant curriculum context from the main Pinecone index.
 * Follows the same pattern as the existing chat route RAG retrieval.
 */
async function retrieveCurriculumContext(
  query: string,
  subject: string,
  gradeLevel: number,
): Promise<CurriculumResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(query);

    const filter: Record<string, unknown> = {
      subject,
    };

    if (gradeLevel) {
      filter.gradeLevel = gradeLevel;
    }

    const matches = await queryPinecone(queryEmbedding, 5, filter);

    return matches.map((match) => {
      const metadata = (match.metadata as Record<string, unknown>) || {};
      return {
        content: (metadata.content as string) || (metadata.text as string) || '',
        source: (metadata.source as string) || (metadata.title as string) || 'Unknown',
        relevanceScore: match.score ?? 0,
      };
    });
  } catch (error) {
    console.error('Error retrieving curriculum context:', error);
    return [];
  }
}

/** Internal type for curriculum retrieval results */
interface CurriculumResult {
  content: string;
  source: string;
  relevanceScore: number;
}

/**
 * Builds the IEP section of the context, fitting within the token budget.
 * Sections are included in priority order (accommodations first, then goals,
 * then present levels, etc.) and truncated when the budget is exhausted.
 */
function buildIepSection(
  results: IepContextResult[],
  budgetTokens: number,
): string {
  if (results.length === 0) return '';

  const header = '=== IEP CONTEXT ===\n\n';
  let content = header;
  let tokensUsed = estimateTokens(header);

  for (const result of results) {
    const sectionLabel = formatSectionLabel(result.sectionType);
    const entry = `--- ${sectionLabel} (relevance: ${result.relevanceScore.toFixed(3)}) ---\n${result.content}\n\n`;
    const entryTokens = estimateTokens(entry);

    if (tokensUsed + entryTokens > budgetTokens) {
      // Try to fit a truncated version
      const remainingTokens = budgetTokens - tokensUsed;
      if (remainingTokens > 50) {
        const truncatedChars = remainingTokens * 4;
        const truncated = `--- ${sectionLabel} (truncated) ---\n${result.content.slice(0, truncatedChars)}...\n\n`;
        content += truncated;
      }
      break;
    }

    content += entry;
    tokensUsed += entryTokens;
  }

  return content.trim();
}

/**
 * Builds the curriculum section of the context, fitting within the token budget.
 */
function buildCurriculumSection(
  results: CurriculumResult[],
  budgetTokens: number,
): string {
  if (results.length === 0) return '';

  const header = '=== CURRICULUM CONTEXT ===\n\n';
  let content = header;
  let tokensUsed = estimateTokens(header);

  for (const [idx, result] of results.entries()) {
    const entry = `[Source ${idx + 1}: ${result.source}] (relevance: ${result.relevanceScore.toFixed(3)})\n${result.content}\n\n`;
    const entryTokens = estimateTokens(entry);

    if (tokensUsed + entryTokens > budgetTokens) {
      const remainingTokens = budgetTokens - tokensUsed;
      if (remainingTokens > 50) {
        const truncatedChars = remainingTokens * 4;
        const truncated = `[Source ${idx + 1}: ${result.source}] (truncated)\n${result.content.slice(0, truncatedChars)}...\n\n`;
        content += truncated;
      }
      break;
    }

    content += entry;
    tokensUsed += entryTokens;
  }

  return content.trim();
}

/**
 * Builds the session history section.
 * If the session history is too long for the budget, it is summarized
 * by keeping the most recent messages and compressing older ones.
 */
function buildSessionSection(
  sessionHistory: string,
  budgetTokens: number,
): string {
  if (!sessionHistory || sessionHistory.trim().length === 0) return '';

  const header = '=== SESSION HISTORY ===\n\n';
  const headerTokens = estimateTokens(header);
  const availableTokens = budgetTokens - headerTokens;

  if (availableTokens <= 0) return '';

  const historyTokens = estimateTokens(sessionHistory);

  if (historyTokens <= availableTokens) {
    // History fits within budget
    return header + sessionHistory.trim();
  }

  // History exceeds budget: summarize older messages, keep recent ones
  return header + summarizeSessionHistory(sessionHistory, availableTokens);
}

/**
 * Summarizes session history to fit within a token budget.
 *
 * Strategy:
 * - Split history into individual messages
 * - Keep the most recent messages (last 30%) verbatim
 * - Compress older messages into a brief summary
 */
function summarizeSessionHistory(
  history: string,
  budgetTokens: number,
): string {
  const messages = history.split('\n').filter((line) => line.trim().length > 0);

  if (messages.length === 0) return '';

  // Reserve 70% of budget for recent messages, 30% for summary of older ones
  const recentBudget = Math.floor(budgetTokens * 0.7);
  const summaryBudget = Math.floor(budgetTokens * 0.3);

  // Determine how many recent messages fit in the budget
  const recentMessages: string[] = [];
  let recentTokens = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i]);
    if (recentTokens + msgTokens > recentBudget) break;
    recentMessages.unshift(messages[i]);
    recentTokens += msgTokens;
  }

  // Summarize older messages
  const olderCount = messages.length - recentMessages.length;
  let result = '';

  if (olderCount > 0) {
    const olderMessages = messages.slice(0, olderCount);

    // Count user and assistant messages
    const userMsgCount = olderMessages.filter((m) =>
      m.startsWith('USER:'),
    ).length;
    const assistantMsgCount = olderMessages.filter((m) =>
      m.startsWith('ASSISTANT:'),
    ).length;

    // Extract key topics from older messages
    const topics = extractTopics(olderMessages);
    const topicStr = topics.length > 0 ? ` Topics discussed: ${topics.join(', ')}.` : '';

    const summaryChars = summaryBudget * 4;
    let summary = `[Earlier in session: ${userMsgCount} student messages, ${assistantMsgCount} tutor responses.${topicStr}]`;

    if (summary.length > summaryChars) {
      summary = summary.slice(0, summaryChars - 3) + '...]';
    }

    result += summary + '\n\n';
  }

  result += recentMessages.join('\n');

  return result.trim();
}

/**
 * Extracts rough topic keywords from a set of messages.
 * Simple heuristic: finds capitalized multi-word phrases and repeated nouns.
 */
function extractTopics(messages: string[]): string[] {
  const text = messages.join(' ').toLowerCase();
  const topicKeywords = [
    'math', 'reading', 'writing', 'science', 'addition', 'subtraction',
    'multiplication', 'division', 'fractions', 'decimals', 'algebra',
    'geometry', 'vocabulary', 'comprehension', 'grammar', 'spelling',
    'phonics', 'biology', 'chemistry', 'physics', 'earth science',
    'problem solving', 'critical thinking', 'behavior', 'regulation',
    'focus', 'attention', 'organization',
  ];

  const found: string[] = [];
  for (const keyword of topicKeywords) {
    if (text.includes(keyword) && found.length < 5) {
      found.push(keyword);
    }
  }

  return found;
}

/**
 * Formats IEP section type into a human-readable label.
 */
function formatSectionLabel(type: IepSectionType): string {
  const labels: Record<IepSectionType, string> = {
    present_levels: 'Present Levels',
    annual_goals: 'Annual Goals',
    short_term_objectives: 'Short-Term Objectives',
    accommodations: 'Accommodations',
    modifications: 'Modifications',
    related_services: 'Related Services',
    transition_plan: 'Transition Plan',
    behavior_plan: 'Behavior Plan',
    assessment_accommodations: 'Assessment Accommodations',
    general: 'General',
  };

  return labels[type] || 'General';
}
