/**
 * Content Safety Validator
 *
 * Validates user input and AI output against educational content safety rules.
 * Designed to protect minors using the RootWork Learning Hub by detecting:
 *   - Harmful content (violence, self-harm, abuse references)
 *   - Inappropriate topics for minors (political, religious, sexual)
 *   - Diagnostic/medical language the AI should never use
 *   - Shaming or blame language
 *   - Personally Identifiable Information (PII)
 *
 * All pattern checks run synchronously and are optimised for per-message
 * real-time evaluation.
 */

import type { Violation, ContentSafetyResult, GuardrailContext } from './types';

// ---------------------------------------------------------------------------
// Pattern definitions
// ---------------------------------------------------------------------------

/** Harmful content patterns — violence, self-harm, abuse references. */
const HARMFUL_CONTENT_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(kill|murder|shoot|stab|assault)\s+(yourself|himself|herself|myself|them|someone)\b/i, label: 'violence_directed' },
  { pattern: /\b(suicide|suicidal|self[- ]?harm|cut\s+myself|end\s+(my|your|their)\s+life)\b/i, label: 'self_harm' },
  { pattern: /\b(molest|rape|sexual\s+assault|sexually\s+abuse)\b/i, label: 'abuse_reference' },
  { pattern: /\b(bomb\s+threat|school\s+shoot|mass\s+shoot|terroris[mt])\b/i, label: 'violence_threat' },
  { pattern: /\bhow\s+to\s+(make|build)\s+(a\s+)?(bomb|weapon|gun|explosive)\b/i, label: 'weapons_instructions' },
  { pattern: /\b(hurt|harm|injure)\s+(yourself|myself|others)\b/i, label: 'harm_intent' },
];

/** Inappropriate topics for minors — political, religious, sexual. */
const INAPPROPRIATE_TOPIC_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(democrat|republican|liberal|conservative)\s+(is|are)\s+(right|wrong|better|worse|evil|stupid)\b/i, label: 'political_bias' },
  { pattern: /\b(vote\s+for|support|endorse)\s+(trump|biden|obama|\w+\s+party)\b/i, label: 'political_endorsement' },
  { pattern: /\b(god\s+is|allah\s+is|jesus\s+is|bible\s+says|quran\s+says)\s+(the\s+)?(only|true|real|right|wrong)\b/i, label: 'religious_assertion' },
  { pattern: /\b(you\s+should\s+(pray|believe\s+in|worship|accept\s+jesus|accept\s+god))\b/i, label: 'religious_proselytization' },
  { pattern: /\b(sex\s+position|pornograph|orgasm|erotic|genital)\b/i, label: 'sexual_content' },
  { pattern: /\b(drugs?\s+are\s+(cool|fun|awesome|great))\b/i, label: 'drug_glorification' },
  { pattern: /\b(alcohol\s+is\s+(fun|great|awesome|cool))\b/i, label: 'alcohol_glorification' },
];

/** Diagnostic / medical language — the AI must never diagnose a student. */
const DIAGNOSTIC_LANGUAGE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\byou\s+(have|suffer\s+from|are\s+diagnosed\s+with)\s+(adhd|add|autism|dyslexia|dyscalculia|anxiety|depression|ptsd|ocd|bipolar|oppositional)\b/i, label: 'diagnosis_statement' },
  { pattern: /\byou\s+(seem|look|appear|sound)\s+(depressed|anxious|manic|autistic|hyperactive|suicidal)\b/i, label: 'implicit_diagnosis' },
  { pattern: /\bi\s+think\s+you\s+(might\s+)?(have|be)\s+(adhd|depression|anxiety|autism|bipolar|ocd)\b/i, label: 'speculative_diagnosis' },
  { pattern: /\byou\s+should\s+(take|start|stop)\s+(your\s+)?(medication|medicine|meds|pills|prescription)\b/i, label: 'medical_advice' },
  { pattern: /\b(take|increase|decrease|stop)\s+(your\s+)?(ritalin|adderall|prozac|zoloft|concerta|lexapro|xanax|medication)\b/i, label: 'specific_medication_advice' },
];

/** Shaming / blame language patterns. */
const SHAMING_LANGUAGE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\byou\s+(should\s+)?(be\s+)?(ashamed|embarrassed)\b/i, label: 'shaming' },
  { pattern: /\bthat('s|\s+is)\s+(stupid|dumb|idiotic|pathetic|lazy)\b/i, label: 'insult' },
  { pattern: /\byou('re|\s+are)\s+(stupid|dumb|lazy|hopeless|useless|worthless|pathetic)\b/i, label: 'personal_attack' },
  { pattern: /\bwhat('s|\s+is)\s+wrong\s+with\s+you\b/i, label: 'blame' },
  { pattern: /\byou\s+(always|never)\s+(fail|mess\s+up|get\s+it\s+wrong|make\s+mistakes)\b/i, label: 'absolutist_blame' },
  { pattern: /\bif\s+you\s+(had\s+)?(just\s+)?(paid\s+attention|listened|studied|tried\s+harder)\b/i, label: 'conditional_blame' },
  { pattern: /\bdisappointed\s+in\s+you\b/i, label: 'disappointment' },
];

/** PII patterns — SSN, phone numbers, email addresses. */
const PII_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/, label: 'ssn' },
  { pattern: /\b(?:\+?1[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/, label: 'phone_number' },
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, label: 'email_address' },
  { pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, label: 'credit_card' },
];

// ---------------------------------------------------------------------------
// Escalation patterns — these require logging and educator alerting
// ---------------------------------------------------------------------------

const ESCALATION_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\b(want\s+to\s+die|kill\s+myself|end\s+it\s+all|don't\s+want\s+to\s+live)\b/i, label: 'self_harm_ideation' },
  { pattern: /\b(someone\s+(hurt|touch|hit|abuse)[sd]?\s+me)\b/i, label: 'abuse_disclosure' },
  { pattern: /\b(going\s+to\s+(hurt|kill|shoot|stab)\s+(someone|him|her|them|my))\b/i, label: 'harm_to_others' },
  { pattern: /\b(i\s+(cut|burn|starve|hurt)\s+myself)\b/i, label: 'self_harm_disclosure' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type PatternDef = { pattern: RegExp; label: string };

/**
 * Run a list of regex patterns against content and collect matches.
 * Returns the matched labels.
 */
function matchPatterns(content: string, patterns: PatternDef[]): string[] {
  const matched: string[] = [];
  for (const { pattern, label } of patterns) {
    if (pattern.test(content)) {
      matched.push(label);
    }
  }
  return matched;
}

/**
 * Redact detected PII from content by replacing matches with a placeholder.
 */
function redactPii(content: string): string {
  let sanitized = content;
  for (const { pattern, label } of PII_PATTERNS) {
    sanitized = sanitized.replace(new RegExp(pattern, 'g'), `[REDACTED_${label.toUpperCase()}]`);
  }
  return sanitized;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate content against all educational safety rules.
 *
 * @param content - The text to check (user message or AI response).
 * @param context - Session context providing student metadata.
 * @returns A {@link ContentSafetyResult} describing safety status.
 */
export function validateContentSafety(
  content: string,
  _context: GuardrailContext,
): ContentSafetyResult {
  const violations: Violation[] = [];
  let sanitized = content;

  // 1. Harmful content
  const harmful = matchPatterns(content, HARMFUL_CONTENT_PATTERNS);
  for (const label of harmful) {
    violations.push({
      category: 'content_safety',
      severity: 'critical',
      message: `Harmful content detected: ${label}`,
      details: { patternLabel: label },
    });
  }

  // 2. Inappropriate topics for minors
  const inappropriate = matchPatterns(content, INAPPROPRIATE_TOPIC_PATTERNS);
  for (const label of inappropriate) {
    violations.push({
      category: 'inappropriate_content',
      severity: 'high',
      message: `Inappropriate topic for minors: ${label}`,
      details: { patternLabel: label },
    });
  }

  // 3. Diagnostic / medical language
  const diagnostic = matchPatterns(content, DIAGNOSTIC_LANGUAGE_PATTERNS);
  for (const label of diagnostic) {
    violations.push({
      category: 'content_safety',
      severity: 'high',
      message: `Diagnostic or medical language detected: ${label}`,
      details: { patternLabel: label },
    });
  }

  // 4. Shaming / blame language
  const shaming = matchPatterns(content, SHAMING_LANGUAGE_PATTERNS);
  for (const label of shaming) {
    violations.push({
      category: 'content_safety',
      severity: 'medium',
      message: `Shaming or blame language detected: ${label}`,
      details: { patternLabel: label },
    });
  }

  // 5. PII detection
  const pii = matchPatterns(content, PII_PATTERNS);
  for (const label of pii) {
    violations.push({
      category: 'pii_detected',
      severity: 'high',
      message: `PII detected: ${label}`,
      details: { patternLabel: label },
    });
  }
  if (pii.length > 0) {
    sanitized = redactPii(sanitized);
  }

  // 6. Escalation triggers (these still get flagged as violations but also
  //    need educator notification — the caller is responsible for routing)
  const escalations = matchPatterns(content, ESCALATION_PATTERNS);
  for (const label of escalations) {
    violations.push({
      category: 'content_safety',
      severity: 'critical',
      message: `Escalation trigger: ${label}. Educator must be notified.`,
      details: { patternLabel: label, requiresEscalation: true },
    });
  }

  // Score: 1.0 = perfectly safe, 0.0 = maximally unsafe
  const criticalCount = violations.filter((v) => v.severity === 'critical').length;
  const highCount = violations.filter((v) => v.severity === 'high').length;
  const mediumCount = violations.filter((v) => v.severity === 'medium').length;

  const penalty = criticalCount * 0.4 + highCount * 0.2 + mediumCount * 0.1;
  const safetyScore = Math.max(0, 1 - penalty);

  return {
    safe: violations.length === 0,
    violations,
    safetyScore,
    sanitizedContent: sanitized,
  };
}

/**
 * Check whether content contains an escalation trigger that requires
 * immediate educator notification.
 */
export function containsEscalationTrigger(content: string): boolean {
  return matchPatterns(content, ESCALATION_PATTERNS).length > 0;
}
