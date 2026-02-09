/**
 * 5Rs Framework Compliance Validator
 *
 * Ensures that every AI response adheres to the RootWork 5Rs methodology:
 *   ROOT -> REGULATE -> REFLECT -> RESTORE -> RECONNECT
 *
 * Checks performed:
 *   - **Phase alignment**: The response matches the current session phase
 *     (e.g. REFLECT responses should contain scaffolding, not grounding).
 *   - **TRACE protocol adherence**: The AI uses Think, Reason, Articulate,
 *     Check, Extend steps during the REFLECT phase.
 *   - **Reasoning-before-confirmation**: The AI must ask for student
 *     reasoning BEFORE confirming correctness.
 *   - **Accommodation compliance**: If CHUNKED_CONTENT or SIMPLIFIED_MODE
 *     is active, the response must be appropriately short / simple.
 *   - **Scaffolding vs. direct answers**: Detects when the AI gives a
 *     direct answer instead of guiding the student to discover it.
 */

import type { Violation, GuardrailContext, FiveRsComplianceResult } from './types';

// ---------------------------------------------------------------------------
// Phase-specific expected indicators
// ---------------------------------------------------------------------------

/** Keywords / patterns expected in each 5R phase. */
const PHASE_INDICATORS: Record<string, RegExp[]> = {
  ROOT: [
    /\bhow\s+(are\s+you|do\s+you)\s+feel/i,
    /\bready\s+to/i,
    /\bgrounding/i,
    /\btake\s+a\s+(moment|breath|second)/i,
    /\bcheck\s+in/i,
    /\bhow('s| is)\s+your\s+(day|morning|afternoon|evening)/i,
  ],
  REGULATE: [
    /\bbreath/i,
    /\bcalm/i,
    /\bregulat/i,
    /\bpause/i,
    /\bbreak/i,
    /\bthat's\s+okay/i,
    /\bchalleng/i,
    /\bsafe/i,
    /\btake\s+(your\s+)?time/i,
    /\bnew\s+connections/i,
  ],
  REFLECT: [
    /\bwhat\s+do\s+you\s+(think|notice)/i,
    /\bhow\s+did\s+you/i,
    /\bwalk\s+me\s+through/i,
    /\btell\s+me\s+(about\s+)?your\s+(thinking|reasoning)/i,
    /\bwhy\s+did\s+you/i,
    /\bcan\s+you\s+explain/i,
    /\bwhat\s+(if|else|about)/i,
    /\btrace/i,
  ],
  RESTORE: [
    /\binteresting\s+thinking/i,
    /\blet('s|\s+us)\s+look\s+at/i,
    /\bwhat\s+happened/i,
    /\bnew\s+synapse/i,
    /\blearning\s+opportunit/i,
    /\berror/i,
    /\bmisconception/i,
    /\bwhere\s+did/i,
    /\blet('s|\s+us)\s+revisit/i,
  ],
  RECONNECT: [
    /\bhow\s+could\s+you\s+use/i,
    /\breal[- ]?world/i,
    /\bgarden/i,
    /\bconnect/i,
    /\bappl(y|ication)/i,
    /\bshare/i,
    /\bnext\s+(?:time|session)/i,
    /\bwhat\s+did\s+you\s+learn/i,
  ],
};

// ---------------------------------------------------------------------------
// TRACE protocol indicators (relevant primarily in REFLECT phase)
// ---------------------------------------------------------------------------

const TRACE_INDICATORS = {
  Think: [/\bwhat\s+do\s+you\s+notice/i, /\bthink\s+about/i, /\blook\s+at\s+this/i],
  Reason: [/\bwhat('s| is)\s+your\s+plan/i, /\bhow\s+would\s+you\s+approach/i, /\bstrateg/i],
  Articulate: [/\btalk\s+me\s+through/i, /\bexplain\s+your/i, /\bwalk\s+me\s+through/i, /\bdescribe/i],
  Check: [/\bhow\s+do\s+you\s+know/i, /\bverif/i, /\bcheck/i, /\bare\s+you\s+sure/i, /\bprove/i],
  Extend: [/\bwhat\s+else/i, /\banother\s+way/i, /\bdifferent\s+(approach|method)/i, /\bextend/i],
};

// ---------------------------------------------------------------------------
// Direct-answer detection (anti-patterns)
// ---------------------------------------------------------------------------

/** Patterns that suggest the AI is giving a direct answer. */
const DIRECT_ANSWER_PATTERNS: RegExp[] = [
  /\bthe\s+(?:correct\s+)?answer\s+is\b/i,
  /\bthat('s|\s+is)\s+(correct|right|exactly\s+right|perfect)\b/i,
  /\byes,?\s+(?:that's\s+)?(?:correct|right)\b/i,
  /\bgood\s+job[!.]?\s*(?:the|that|it)/i,
  /\bcorrect[!.]\s/i,
];

/**
 * Phrases that indicate the AI asked for reasoning. When one of these
 * appears BEFORE a direct answer, the violation is downgraded or removed.
 */
const REASONING_REQUEST_PATTERNS: RegExp[] = [
  /\bhow\s+did\s+you\s+(get|arrive|come\s+up|figure)/i,
  /\bwalk\s+me\s+through/i,
  /\btell\s+me\s+(?:about\s+)?your\s+(?:thinking|reasoning)/i,
  /\bwhy\s+do\s+you\s+think/i,
  /\bcan\s+you\s+explain/i,
  /\bwhat\s+made\s+you/i,
  /\bhow\s+do\s+you\s+know/i,
];

// ---------------------------------------------------------------------------
// Accommodation checks
// ---------------------------------------------------------------------------

/** Maximum response length (characters) when CHUNKED_CONTENT is active. */
const CHUNKED_CONTENT_MAX_LENGTH = 500;

/** Maximum average word length when SIMPLIFIED_MODE is active. */
const SIMPLIFIED_MODE_MAX_AVG_WORD_LENGTH = 7;

/** Maximum sentence count when CHUNKED_CONTENT is active. */
const CHUNKED_CONTENT_MAX_SENTENCES = 5;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function countSentences(text: string): number {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
}

function averageWordLength(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return 0;
  const totalChars = words.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, '').length, 0);
  return totalChars / words.length;
}

function testAnyPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function countPhaseIndicatorMatches(text: string, phase: string): number {
  const indicators = PHASE_INDICATORS[phase];
  if (!indicators) return 0;
  return indicators.filter((p) => p.test(text)).length;
}

/**
 * Determine the position of the first match for any of the given patterns.
 * Returns -1 if no match is found.
 */
function firstMatchPosition(text: string, patterns: RegExp[]): number {
  let earliest = -1;
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && (earliest === -1 || match.index < earliest)) {
      earliest = match.index;
    }
  }
  return earliest;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate that an AI response complies with the RootWork 5Rs framework.
 *
 * @param aiResponse - The generated AI output text.
 * @param context    - Session context including current phase and accommodations.
 * @returns A {@link FiveRsComplianceResult} with alignment score and violations.
 */
export function validateFiveRsCompliance(
  aiResponse: string,
  context: GuardrailContext,
): FiveRsComplianceResult {
  const violations: Violation[] = [];
  const phase = context.sessionPhase.toUpperCase();

  // -----------------------------------------------------------------------
  // 1. Phase alignment — does the response contain indicators for the
  //    current phase?
  // -----------------------------------------------------------------------
  const currentPhaseMatches = countPhaseIndicatorMatches(aiResponse, phase);
  const totalIndicators = (PHASE_INDICATORS[phase] || []).length;
  const phaseAlignmentScore = totalIndicators > 0
    ? Math.min(1, currentPhaseMatches / Math.max(1, Math.ceil(totalIndicators * 0.3)))
    : 1;

  // Check for wrong-phase indicators
  const wrongPhaseSignals: string[] = [];
  for (const [otherPhase, indicators] of Object.entries(PHASE_INDICATORS)) {
    if (otherPhase === phase) continue;
    const matches = indicators.filter((p) => p.test(aiResponse)).length;
    if (matches > currentPhaseMatches && currentPhaseMatches === 0) {
      wrongPhaseSignals.push(otherPhase);
    }
  }

  if (wrongPhaseSignals.length > 0 && currentPhaseMatches === 0) {
    violations.push({
      category: 'five_rs_compliance',
      severity: 'medium',
      message: `Response appears aligned with ${wrongPhaseSignals.join(', ')} phase(s) instead of current ${phase} phase`,
      details: { expectedPhase: phase, detectedPhases: wrongPhaseSignals },
    });
  }

  // -----------------------------------------------------------------------
  // 2. TRACE protocol adherence (primarily in REFLECT phase)
  // -----------------------------------------------------------------------
  const traceAdherence = {
    asksForReasoning: testAnyPattern(aiResponse, REASONING_REQUEST_PATTERNS),
    scaffoldsInsteadOfTelling: !testAnyPattern(aiResponse, DIRECT_ANSWER_PATTERNS),
    usesTraceSteps: false,
  };

  if (phase === 'REFLECT') {
    // Count how many TRACE steps are present
    const traceStepsPresent = Object.values(TRACE_INDICATORS).filter((patterns) =>
      testAnyPattern(aiResponse, patterns),
    ).length;
    traceAdherence.usesTraceSteps = traceStepsPresent >= 1;

    if (traceStepsPresent === 0) {
      violations.push({
        category: 'five_rs_compliance',
        severity: 'low',
        message: 'REFLECT phase response does not include any TRACE protocol steps (Think, Reason, Articulate, Check, Extend)',
        details: { traceStepsFound: traceStepsPresent },
      });
    }
  }

  // -----------------------------------------------------------------------
  // 3. Reasoning-before-confirmation check
  // -----------------------------------------------------------------------
  const directAnswerPos = firstMatchPosition(aiResponse, DIRECT_ANSWER_PATTERNS);
  const reasoningRequestPos = firstMatchPosition(aiResponse, REASONING_REQUEST_PATTERNS);

  if (directAnswerPos !== -1) {
    // A direct answer exists — did the AI ask for reasoning first?
    const askedFirst = reasoningRequestPos !== -1 && reasoningRequestPos < directAnswerPos;
    if (!askedFirst) {
      violations.push({
        category: 'five_rs_compliance',
        severity: 'high',
        message: 'AI confirmed correctness without first asking the student to explain their reasoning',
        details: { directAnswerPosition: directAnswerPos, reasoningRequestPosition: reasoningRequestPos },
      });
      traceAdherence.asksForReasoning = false;
    }
  }

  // -----------------------------------------------------------------------
  // 4. Scaffolding vs. direct-answer detection
  // -----------------------------------------------------------------------
  if (!traceAdherence.scaffoldsInsteadOfTelling && phase === 'REFLECT') {
    violations.push({
      category: 'five_rs_compliance',
      severity: 'medium',
      message: 'AI appears to give a direct answer instead of scaffolding the student towards discovery',
      details: { phase },
    });
  }

  // -----------------------------------------------------------------------
  // 5. Accommodation compliance
  // -----------------------------------------------------------------------
  const accommodations = context.accommodations.map((a: string) => a.toUpperCase());

  if (accommodations.includes('CHUNKED_CONTENT')) {
    if (aiResponse.length > CHUNKED_CONTENT_MAX_LENGTH) {
      violations.push({
        category: 'five_rs_compliance',
        severity: 'medium',
        message: `Response exceeds CHUNKED_CONTENT limit (${aiResponse.length} chars > ${CHUNKED_CONTENT_MAX_LENGTH} max)`,
        details: { accommodation: 'CHUNKED_CONTENT', length: aiResponse.length, maxLength: CHUNKED_CONTENT_MAX_LENGTH },
      });
    }
    const sentenceCount = countSentences(aiResponse);
    if (sentenceCount > CHUNKED_CONTENT_MAX_SENTENCES) {
      violations.push({
        category: 'five_rs_compliance',
        severity: 'low',
        message: `Response has too many sentences for CHUNKED_CONTENT (${sentenceCount} > ${CHUNKED_CONTENT_MAX_SENTENCES})`,
        details: { accommodation: 'CHUNKED_CONTENT', sentenceCount, maxSentences: CHUNKED_CONTENT_MAX_SENTENCES },
      });
    }
  }

  if (accommodations.includes('SIMPLIFIED_MODE')) {
    const avgWordLen = averageWordLength(aiResponse);
    if (avgWordLen > SIMPLIFIED_MODE_MAX_AVG_WORD_LENGTH) {
      violations.push({
        category: 'five_rs_compliance',
        severity: 'low',
        message: `Average word length (${avgWordLen.toFixed(1)}) exceeds SIMPLIFIED_MODE threshold (${SIMPLIFIED_MODE_MAX_AVG_WORD_LENGTH})`,
        details: { accommodation: 'SIMPLIFIED_MODE', averageWordLength: avgWordLen, maxAverageWordLength: SIMPLIFIED_MODE_MAX_AVG_WORD_LENGTH },
      });
    }
  }

  return {
    compliant: violations.length === 0,
    phaseAlignmentScore,
    violations,
    traceAdherence,
  };
}
