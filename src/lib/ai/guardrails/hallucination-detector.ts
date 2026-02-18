/**
 * Hallucination Detector
 *
 * Prevents the AI tutor from generating ungrounded or fabricated content.
 * This module performs four classes of checks:
 *
 *   1. **Citation verification** — When the AI references specific standards,
 *      modules, or curriculum items, verifies they appear in the provided
 *      RAG context.
 *
 *   2. **Factual grounding check** — Ensures specific factual claims in the
 *      AI response can be traced back to the RAG context or session history.
 *
 *   3. **Confidence scoring** — Produces a 0-1 score reflecting how well
 *      the response is grounded in the provided context.
 *
 *   4. **Fabrication detection** — Catches fabricated student data such as
 *      invented scores, assessment results, or student metadata that were
 *      never present in the session.
 *
 * All checks are synchronous string analysis — no external API calls —
 * so they can run on every message in real time.
 */

import type {
  Violation,
  GuardrailContext,
  HallucinationCheck,
  GroundedClaim,
  UngroundedClaim,
} from './types';

// ---------------------------------------------------------------------------
// Citation patterns — things that look like specific references
// ---------------------------------------------------------------------------

/**
 * Matches phrases like "Module 3", "Lesson 4.2", "Standard 3.NBT.1",
 * "Unit 7", "Chapter 12", "Section 2.3", "CCSS.Math.Content.3.NBT.A.1".
 */
const CITATION_PATTERNS: RegExp[] = [
  /\b(?:Module|Unit|Chapter|Lesson|Section)\s+\d+(?:\.\d+)*\b/gi,
  /\b(?:Standard|CCSS|NGSS|CPALMS)\s*\.?[\w.]+\b/gi,
  /\b[A-Z]{2,}\.\w+(?:\.\w+)+\b/g, // e.g. CCSS.Math.Content.3.NBT.A.1
];

/**
 * Matches phrases like "scored 85%", "got a 92", "your score was 78",
 * "assessment result: 65", "mastery level 3".
 */
const FABRICATED_DATA_PATTERNS: RegExp[] = [
  /\byou(?:'ve| have)?\s+(?:scored|earned|received|got|achieved)\s+(?:a\s+)?\d+(?:\.\d+)?%?\b/i,
  /\byour\s+(?:score|grade|result|mastery\s+level|performance)\s+(?:is|was|shows)\s+\d+/i,
  /\bassessment\s+(?:result|score|outcome)[:\s]+\d+/i,
  /\byou\s+(?:completed|passed|failed)\s+\d+\s+(?:out\s+of|\/)\s+\d+/i,
  /\byour\s+(?:IQ|reading\s+level|math\s+level)\s+(?:is|was)\s+\d+/i,
  /\baccording\s+to\s+your\s+(?:records?|data|profile|assessment)/i,
];

/**
 * Matches specific factual claims — sentences that assert a definitive fact
 * (not a question or hedged statement).
 */
const SPECIFIC_CLAIM_PATTERNS: RegExp[] = [
  /\bthe\s+(?:answer|correct\s+answer|solution)\s+is\s+/i,
  /\bthis\s+(?:means|shows|proves|demonstrates)\s+that\s+/i,
  /\baccording\s+to\s+(?:the\s+)?(?:curriculum|textbook|standard|lesson)/i,
  /\bin\s+(?:Module|Unit|Chapter|Lesson)\s+\d+/i,
  /\bresearch\s+(?:shows|indicates|suggests|proves)\b/i,
  /\bstudies\s+(?:show|indicate|suggest|prove)\b/i,
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract all citation-like references from text.
 */
function extractCitations(text: string): string[] {
  const citations: string[] = [];
  for (const pattern of CITATION_PATTERNS) {
    // Reset lastIndex so global patterns work each call
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      citations.push(match[0]);
    }
  }
  return [...new Set(citations)];
}

/**
 * Extract sentences that contain specific factual claims.
 */
function extractSpecificClaims(text: string): string[] {
  // Split into sentences (rough but sufficient for real-time checks)
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 10);
  const claims: string[] = [];

  for (const sentence of sentences) {
    for (const pattern of SPECIFIC_CLAIM_PATTERNS) {
      if (pattern.test(sentence)) {
        claims.push(sentence.trim());
        break; // one match per sentence is enough
      }
    }
  }
  return claims;
}

/**
 * Extract fabricated student data references from text.
 */
function extractFabricatedDataReferences(text: string): string[] {
  const refs: string[] = [];
  for (const pattern of FABRICATED_DATA_PATTERNS) {
    pattern.lastIndex = 0;
    const match = text.match(pattern);
    if (match) {
      refs.push(match[0]);
    }
  }
  return [...new Set(refs)];
}

/**
 * Check whether a reference or claim is grounded in the supplied context.
 * Uses a fuzzy substring match — the reference (lowered, trimmed) must
 * appear somewhere in the combined context text.
 */
function isGroundedInContext(reference: string, contextText: string): boolean {
  const normRef = reference.toLowerCase().trim();
  const normCtx = contextText.toLowerCase();
  // Direct substring match
  if (normCtx.includes(normRef)) return true;

  // For shorter references (like "Module 3") also check token-level presence
  const tokens = normRef.split(/\s+/);
  if (tokens.length <= 3) {
    return tokens.every((token) => normCtx.includes(token));
  }

  // For longer claims, check if at least 60% of meaningful tokens appear
  const meaningfulTokens = tokens.filter((t) => t.length > 3);
  if (meaningfulTokens.length === 0) return true;
  const found = meaningfulTokens.filter((t) => normCtx.includes(t));
  return found.length / meaningfulTokens.length >= 0.6;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run hallucination detection on an AI response.
 *
 * @param aiResponse   - The generated AI output text.
 * @param context      - The guardrail context containing RAG context, session
 *                        history, and student metadata.
 * @returns A {@link HallucinationCheck} with scores and lists of
 *          grounded / ungrounded claims.
 */
export function detectHallucinations(
  aiResponse: string,
  context: GuardrailContext,
): HallucinationCheck {
  const violations: Violation[] = [];
  const groundedClaims: GroundedClaim[] = [];
  const ungroundedClaims: UngroundedClaim[] = [];
  const fabricatedReferences: string[] = [];

  // Build combined context for grounding checks
  const combinedContext = [context.ragContext, context.sessionHistory].join('\n');

  // -----------------------------------------------------------------------
  // 1. Citation verification
  // -----------------------------------------------------------------------
  const citations = extractCitations(aiResponse);
  for (const citation of citations) {
    if (isGroundedInContext(citation, combinedContext)) {
      groundedClaims.push({ claim: citation, sourceExcerpt: citation });
    } else {
      ungroundedClaims.push({
        claim: citation,
        reason: 'Citation not found in provided curriculum or session context',
      });
      violations.push({
        category: 'hallucination',
        severity: 'medium',
        message: `Unverified citation: "${citation}" not found in context`,
        details: { citation },
      });
    }
  }

  // -----------------------------------------------------------------------
  // 2. Factual grounding check
  // -----------------------------------------------------------------------
  const claims = extractSpecificClaims(aiResponse);
  for (const claim of claims) {
    if (isGroundedInContext(claim, combinedContext)) {
      groundedClaims.push({
        claim,
        sourceExcerpt: claim.slice(0, 100),
      });
    } else {
      // Only flag if there IS context to ground against
      if (combinedContext.trim().length > 0) {
        ungroundedClaims.push({
          claim,
          reason: 'Specific claim not supported by provided context',
        });
      }
    }
  }

  // -----------------------------------------------------------------------
  // 3. Fabrication detection — invented student data
  // -----------------------------------------------------------------------
  const fabrications = extractFabricatedDataReferences(aiResponse);
  for (const fab of fabrications) {
    if (!isGroundedInContext(fab, combinedContext)) {
      fabricatedReferences.push(fab);
      violations.push({
        category: 'hallucination',
        severity: 'high',
        message: `Potentially fabricated student data: "${fab}"`,
        details: { fabricatedReference: fab },
      });
    }
  }

  // -----------------------------------------------------------------------
  // 4. Confidence scoring
  // -----------------------------------------------------------------------
  const totalCheckableItems = citations.length + claims.length + fabrications.length;

  let confidenceScore: number;
  if (totalCheckableItems === 0) {
    // Nothing to verify — the response is conversational / scaffolding.
    // Give a high default confidence since scaffolding rarely hallucinates.
    confidenceScore = 0.95;
  } else {
    const groundedCount = groundedClaims.length;
    const ungroundedCount = ungroundedClaims.length + fabricatedReferences.length;
    const total = groundedCount + ungroundedCount;
    confidenceScore = total > 0 ? groundedCount / total : 0.95;
  }

  // Add a high-severity violation if confidence is very low
  if (confidenceScore < 0.5 && totalCheckableItems > 0) {
    violations.push({
      category: 'hallucination',
      severity: 'high',
      message: `Low grounding confidence (${(confidenceScore * 100).toFixed(0)}%). Response may contain hallucinated content.`,
      details: { confidenceScore, groundedCount: groundedClaims.length, ungroundedCount: ungroundedClaims.length },
    });
  }

  return {
    confidenceScore,
    groundedClaims,
    ungroundedClaims,
    fabricatedReferences,
    violations,
  };
}
