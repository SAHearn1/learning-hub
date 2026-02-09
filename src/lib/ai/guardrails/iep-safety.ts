/**
 * IEP (Individualized Education Program) Safety Guardrails
 *
 * Ensures the AI tutor operates within the boundaries defined by a student's
 * IEP accommodations and never oversteps into territory reserved for
 * educators:
 *
 *   - Validates that AI suggestions align with documented accommodations
 *   - Prevents the AI from recommending changes to IEP accommodations
 *   - Ensures the AI does not disclose IEP details to unauthorized parties
 *   - Validates suggested difficulty levels match IEP parameters
 *   - Checks that content modifications align with accommodation types
 *     (SIMPLIFIED_MODE, CHUNKED_CONTENT, EXTENDED_TIME, etc.)
 */

import type { Violation, GuardrailContext, IepSafetyResult } from './types';

// ---------------------------------------------------------------------------
// Known accommodation types and their behavioral requirements
// ---------------------------------------------------------------------------

/**
 * Maps accommodation identifiers to expected behavioral constraints in AI
 * responses. Each entry describes what the AI SHOULD do (positive) or
 * MUST NOT do (negative).
 */
const ACCOMMODATION_REQUIREMENTS: Record<string, {
  description: string;
  /** Patterns that SHOULD appear in compliant responses. */
  expectedPatterns: RegExp[];
  /** Patterns that MUST NOT appear. */
  prohibitedPatterns: RegExp[];
  /** Max response length if applicable (0 = no limit). */
  maxResponseLength: number;
}> = {
  SIMPLIFIED_MODE: {
    description: 'Use simpler vocabulary and break instructions into smaller steps',
    expectedPatterns: [],
    prohibitedPatterns: [],
    maxResponseLength: 0, // handled by five-rs-compliance
  },
  CHUNKED_CONTENT: {
    description: 'Present information in small chunks, one idea per message',
    expectedPatterns: [],
    prohibitedPatterns: [],
    maxResponseLength: 500,
  },
  EXTENDED_TIME: {
    description: 'Allow extra processing time, do not rush responses',
    expectedPatterns: [],
    prohibitedPatterns: [
      /\bhurry\s+up\b/i,
      /\bquickly\b/i,
      /\btime('s|\s+is)\s+(?:running\s+out|up|almost\s+(?:up|over))\b/i,
      /\bwe\s+need\s+to\s+(?:move\s+on|speed\s+up|hurry)\b/i,
      /\blet('s|\s+us)\s+(?:move\s+on|go\s+faster|speed\s+up)\b/i,
    ],
    maxResponseLength: 0,
  },
  REDUCED_STIMULI: {
    description: 'Keep responses shorter and simpler, minimize visual complexity',
    expectedPatterns: [],
    prohibitedPatterns: [],
    maxResponseLength: 400,
  },
  FREQUENT_BREAKS: {
    description: 'Offer breaks more frequently, check in on regulation often',
    expectedPatterns: [],
    prohibitedPatterns: [
      /\blet('s|\s+us)\s+keep\s+going\s+without\s+stopping\b/i,
      /\bno\s+break/i,
    ],
    maxResponseLength: 0,
  },
  MODIFIED_DIFFICULTY: {
    description: 'Start with lower difficulty and scaffold up gradually',
    expectedPatterns: [],
    prohibitedPatterns: [
      /\bthis\s+should\s+be\s+easy\b/i,
      /\byou\s+should\s+(already\s+)?know\s+this\b/i,
    ],
    maxResponseLength: 0,
  },
  VISUAL_SUPPORTS: {
    description: 'Include visual representations when possible',
    expectedPatterns: [],
    prohibitedPatterns: [],
    maxResponseLength: 0,
  },
};

// ---------------------------------------------------------------------------
// IEP modification / recommendation detection
// ---------------------------------------------------------------------------

/** Patterns detecting when the AI tries to recommend IEP changes. */
const IEP_MODIFICATION_PATTERNS: RegExp[] = [
  /\byou\s+(?:should|need\s+to|might\s+want\s+to)\s+(?:change|update|modify|remove|add\s+to)\s+(?:your\s+)?(?:iep|accommodation|plan)\b/i,
  /\bi\s+(?:recommend|suggest|think\s+you\s+should)\s+(?:chang|updat|modif|remov|add)/i,
  /\byour\s+(?:iep|accommodation)\s+(?:should|needs\s+to|could)\s+(?:be\s+)?(?:changed|updated|modified|removed|adjusted)\b/i,
  /\b(?:let('s|\s+us)|we\s+should)\s+(?:change|update|modify|adjust)\s+(?:your\s+)?(?:iep|accommodation)\b/i,
  /\byou\s+(?:don't|do\s+not)\s+(?:need|require)\s+(?:this|that|your)\s+(?:accommodation|iep\s+(?:support|plan))\b/i,
  /\byou've\s+(?:outgrown|moved\s+past|don't\s+need)\s+(?:this|your)\s+(?:accommodation)\b/i,
];

/** Patterns detecting when the AI discloses IEP details. */
const IEP_DISCLOSURE_PATTERNS: RegExp[] = [
  /\byour\s+iep\s+(?:says|states|indicates|requires|includes|specifies)\b/i,
  /\baccording\s+to\s+your\s+iep\b/i,
  /\byour\s+(?:individualized\s+education\s+(?:program|plan))\b/i,
  /\byour\s+(?:special\s+education|sped)\s+(?:plan|program|services)\b/i,
  /\byou\s+(?:have|are\s+on)\s+(?:an?\s+)?iep\b/i,
  /\byour\s+(?:disability|diagnosis|condition)\s+(?:means|requires)\b/i,
];

/** Patterns detecting inappropriate difficulty level suggestions. */
const DIFFICULTY_OVERRIDE_PATTERNS: RegExp[] = [
  /\blet('s|\s+us)\s+(?:try|move\s+(?:to|on\s+to))\s+(?:something\s+)?(?:much\s+)?(?:harder|more\s+(?:advanced|difficult|challenging))\b/i,
  /\bthis\s+is\s+(?:too\s+)?easy\s+for\s+you\b/i,
  /\byou('re|\s+are)\s+(?:ready\s+for|beyond)\s+(?:much\s+)?(?:harder|more\s+advanced)\s+(?:work|material|content|problems)\b/i,
  /\bskip\s+(?:ahead|to)\s+(?:the\s+)?(?:harder|advanced|next\s+level)\b/i,
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function testAnyPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate that an AI response respects the student's IEP safety boundaries.
 *
 * @param aiResponse - The generated AI output text.
 * @param context    - Session context with accommodations and student metadata.
 * @returns An {@link IepSafetyResult} listing any violations.
 */
export function validateIepSafety(
  aiResponse: string,
  context: GuardrailContext,
): IepSafetyResult {
  const violations: Violation[] = [];
  const accommodationAlignment: Record<string, boolean> = {};
  const accommodations = context.accommodations.map((a: string) => a.toUpperCase());

  // -----------------------------------------------------------------------
  // 1. Check each active accommodation for prohibited patterns
  // -----------------------------------------------------------------------
  for (const accommodation of accommodations) {
    const requirements = ACCOMMODATION_REQUIREMENTS[accommodation];
    if (!requirements) {
      // Unknown accommodation — still track alignment as true (no rules to break)
      accommodationAlignment[accommodation] = true;
      continue;
    }

    let aligned = true;

    // Check prohibited patterns
    for (const prohibited of requirements.prohibitedPatterns) {
      if (prohibited.test(aiResponse)) {
        aligned = false;
        violations.push({
          category: 'iep_safety',
          severity: 'medium',
          message: `Response violates ${accommodation} accommodation: contains prohibited language`,
          details: { accommodation, requirement: requirements.description },
        });
        break; // one violation per accommodation is sufficient
      }
    }

    // Check max response length
    if (requirements.maxResponseLength > 0 && aiResponse.length > requirements.maxResponseLength) {
      aligned = false;
      violations.push({
        category: 'iep_safety',
        severity: 'medium',
        message: `Response exceeds max length for ${accommodation} accommodation (${aiResponse.length} chars > ${requirements.maxResponseLength} max)`,
        details: { accommodation, length: aiResponse.length, maxLength: requirements.maxResponseLength },
      });
    }

    accommodationAlignment[accommodation] = aligned;
  }

  // -----------------------------------------------------------------------
  // 2. IEP modification recommendations (never allowed for AI)
  // -----------------------------------------------------------------------
  if (testAnyPattern(aiResponse, IEP_MODIFICATION_PATTERNS)) {
    violations.push({
      category: 'unauthorized_recommendation',
      severity: 'high',
      message: 'AI must not recommend changes to IEP accommodations. Only educators can modify IEP plans.',
      details: { rule: 'iep_modification_prohibited' },
    });
  }

  // -----------------------------------------------------------------------
  // 3. IEP disclosure to student
  // -----------------------------------------------------------------------
  if (testAnyPattern(aiResponse, IEP_DISCLOSURE_PATTERNS)) {
    violations.push({
      category: 'iep_safety',
      severity: 'high',
      message: 'AI must not disclose IEP details or reference the student\'s IEP directly. Accommodations should be applied silently.',
      details: { rule: 'iep_disclosure_prohibited' },
    });
  }

  // -----------------------------------------------------------------------
  // 4. Inappropriate difficulty level changes
  // -----------------------------------------------------------------------
  if (accommodations.includes('MODIFIED_DIFFICULTY')) {
    if (testAnyPattern(aiResponse, DIFFICULTY_OVERRIDE_PATTERNS)) {
      violations.push({
        category: 'iep_safety',
        severity: 'medium',
        message: 'AI suggested an inappropriate difficulty increase for a student with MODIFIED_DIFFICULTY accommodation',
        details: { accommodation: 'MODIFIED_DIFFICULTY', rule: 'difficulty_override_prohibited' },
      });
      accommodationAlignment['MODIFIED_DIFFICULTY'] = false;
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
    accommodationAlignment,
  };
}
