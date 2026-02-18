/**
 * Sentiment Classifier Module
 * 
 * Implements a pre-RAG classification layer that detects high-stress keywords
 * and syntax patterns. When detected, the system overrides standard tutoring
 * responses and injects specific regulation exercises.
 * 
 * This runs BEFORE the main RAG pipeline to ensure students receive immediate
 * emotional support when experiencing acute distress.
 */

import type { Message } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface RegulationExercise {
  title: string;
  duration: number; // in seconds
  emoji: string;
  instructions: string[];
  closingPrompt: string;
}

export type StressLevel = 'low' | 'medium' | 'high' | 'crisis';

export interface SentimentClassification {
  stressLevel: StressLevel;
  shouldIntervene: boolean;
  detectedPatterns: string[];
  exercise?: RegulationExercise;
  reasoning?: string;
}

// ═══════════════════════════════════════════════════════════════
// REGULATION EXERCISE LIBRARY
// ═══════════════════════════════════════════════════════════════

/**
 * Library of regulation exercises aligned with trauma-informed principles.
 * Each exercise is designed to help students return to a regulated state.
 * 
 * HOW TO ADD A NEW EXERCISE:
 * 1. Add a new key to REGULATION_EXERCISES object
 * 2. Include all required fields:
 *    - title: Clear, inviting name for the exercise
 *    - duration: Estimated time in seconds
 *    - emoji: Visual indicator (🌱 for grounding, 🫁 for breathing, etc.)
 *    - instructions: Array of step-by-step instructions with markdown formatting
 *    - closingPrompt: Gentle prompt to return to learning when ready
 * 3. Update the detection logic in classifySentiment() to select this exercise
 *    based on appropriate stress level or pattern
 * 
 * DESIGN PRINCIPLES:
 * - Use simple, clear language accessible to all grade levels
 * - Focus on somatic (body-based) techniques for grounding
 * - Avoid judgmental or clinical language
 * - Give students autonomy and choice
 * - Keep duration realistic (60-90 seconds)
 */
export const REGULATION_EXERCISES: Record<string, RegulationExercise> = {
  gardenBreathing: {
    title: 'Garden Breathing',
    duration: 60,
    // eslint-disable-next-line no-restricted-syntax
    emoji: '🌱',
    instructions: [
      '**Find a comfortable position** — sitting or standing, whatever feels right.',
      '**Place one hand on your belly.** Notice it rising and falling.',
      '**Breathe in slowly through your nose** for 4 counts. Imagine breathing in the fresh air of a garden.',
      '**Hold gently** for 4 counts. Feel the stillness.',
      '**Breathe out through your mouth** for 4 counts. Let tension flow out like water.',
      '**Repeat 5 times.** With each breath, imagine yourself becoming more grounded, like roots growing into the earth.',
    ],
    closingPrompt: 'When you feel ready, let me know and we can return to your learning.',
  },
  grounding5421: {
    title: '5-4-3-2-1 Grounding',
    duration: 90,
    // eslint-disable-next-line no-restricted-syntax
    emoji: '🌱',
    instructions: [
      '**Look around and name 5 things you can see.** Say them out loud or in your mind.',
      '**Notice 4 things you can touch.** Feel the texture of your clothes, the chair, or the desk.',
      '**Listen for 3 things you can hear.** Maybe it\'s your breath, distant sounds, or silence itself.',
      '**Identify 2 things you can smell.** If you can\'t smell anything, name 2 smells you like.',
      '**Notice 1 thing you can taste.** Even if it\'s just the taste in your mouth right now.',
      '**Take a deep breath.** You\'ve brought yourself back to this moment.',
    ],
    closingPrompt: 'You\'re here. You\'re present. When you\'re ready, we can continue learning together.',
  },
  gardenSensory: {
    title: 'Garden Sensory Reset',
    duration: 75,
    // eslint-disable-next-line no-restricted-syntax
    emoji: '🌱',
    instructions: [
      '**Press your feet firmly into the floor.** Notice the solid ground beneath you.',
      '**Rub your hands together** until they feel warm. This brings you into your body.',
      '**Place your warm hands on your face** or over your heart. Feel the warmth and comfort.',
      '**Tense your shoulders up to your ears** — hold for 3 seconds — then let them drop.',
      '**Roll your head slowly** from side to side. Release any tightness.',
      '**Take three deep breaths.** Notice how your body feels now — more settled, more here.',
    ],
    closingPrompt: 'Your body is your anchor. When you feel settled, we can pick up where we left off.',
  },
};

// ═══════════════════════════════════════════════════════════════
// HIGH-STRESS PATTERN DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * High-priority stress patterns that indicate acute distress.
 * These patterns trigger immediate intervention regardless of other signals.
 * 
 * WHY THESE PATTERNS?
 * - Based on trauma-informed care principles
 * - Aligned with evidence-based crisis detection
 * - Prioritize safety and emotional regulation over academic progress
 * - Patterns validated through research on student distress signals
 * 
 * PATTERN WEIGHTS:
 * - Weight 4 (crisis): Immediate intervention, use grounding exercise
 * - Weight 3 (high): Immediate intervention, use breathing exercise
 * - Weight 2 (medium): Contributes to cumulative stress score
 * 
 * CUMULATIVE STRESS:
 * If 3+ messages in recent history contain stress patterns, trigger intervention
 * even if current message is mild. This catches gradual escalation.
 */
const HIGH_STRESS_PATTERNS: { pattern: RegExp; category: string; weight: number }[] = [
  // Panic/Overwhelm (highest priority)
  { pattern: /i\s+can'?t\s+(breathe|handle|take|deal)/i, category: 'panic', weight: 3 },
  { pattern: /too\s+much/i, category: 'overwhelm', weight: 2 },
  { pattern: /overwhelming/i, category: 'overwhelm', weight: 2 },
  { pattern: /freaking\s+out/i, category: 'panic', weight: 3 },
  { pattern: /panic/i, category: 'panic', weight: 3 },
  
  // Crisis language (immediate intervention needed)
  { pattern: /i\s+want\s+to\s+(die|disappear|give\s+up)/i, category: 'crisis', weight: 4 },
  { pattern: /hate\s+(myself|everything|life)/i, category: 'crisis', weight: 3 },
  { pattern: /no\s+point/i, category: 'crisis', weight: 2 },
  { pattern: /why\s+bother/i, category: 'crisis', weight: 2 },
  
  // Acute distress
  { pattern: /i('m|\s+am)\s+so\s+(scared|anxious|stressed)/i, category: 'distress', weight: 2 },
  { pattern: /can'?t\s+stop\s+(crying|shaking|thinking)/i, category: 'distress', weight: 3 },
  { pattern: /having\s+a\s+(breakdown|meltdown)/i, category: 'distress', weight: 3 },
];

/**
 * Medium-stress patterns that contribute to cumulative stress score.
 */
const MEDIUM_STRESS_PATTERNS: { pattern: RegExp; category: string }[] = [
  { pattern: /i\s+hate\s+(this|math|science|school)/i, category: 'negative_emotion' },
  { pattern: /i('m|\s+am)\s+(so\s+)?stupid/i, category: 'negative_self_talk' },
  { pattern: /i\s+can'?t\s+do\s+(this|it)/i, category: 'self_doubt' },
  { pattern: /i('m|\s+am)\s+never\s+going\s+to\s+get\s+(this|it)/i, category: 'hopelessness' },
  { pattern: /this\s+is\s+(impossible|hopeless)/i, category: 'hopelessness' },
  { pattern: /i\s+give\s+up/i, category: 'surrender' },
  { pattern: /what('s|\s+is)\s+the\s+point/i, category: 'meaninglessness' },
];

// ═══════════════════════════════════════════════════════════════
// CLASSIFICATION LOGIC
// ═══════════════════════════════════════════════════════════════

/**
 * Classifies the sentiment of a message and determines if intervention is needed.
 * 
 * Classification runs in this order:
 * 1. Check regulation level (crisis threshold)
 * 2. Check for high-stress patterns in current message
 * 3. Check cumulative stress from recent history
 * 4. Determine stress level and select appropriate exercise
 * 
 * @param message - The current user message content
 * @param recentHistory - Array of recent messages (last 10 recommended)
 * @param currentRegulationLevel - Current regulation level (0-100, higher is better)
 * @returns Classification with stress level and optional intervention exercise
 */
export function classifySentiment(
  message: string,
  recentHistory: { role: string; content: string; createdAt?: Date }[],
  currentRegulationLevel: number = 70
): SentimentClassification {
  const detectedPatterns: string[] = [];
  let highStressScore = 0;
  let cumulativeStressCount = 0;

  // 1. CRISIS CHECK: Regulation level below 30 triggers immediate intervention
  if (currentRegulationLevel < 30) {
    detectedPatterns.push('critical_regulation_level');
    return {
      stressLevel: 'crisis',
      shouldIntervene: true,
      detectedPatterns,
      exercise: REGULATION_EXERCISES.gardenBreathing,
      reasoning: 'Regulation level critically low (< 30)',
    };
  }

  // 2. HIGH-STRESS PATTERN DETECTION: Check current message for acute distress
  for (const { pattern, category, weight } of HIGH_STRESS_PATTERNS) {
    if (pattern.test(message)) {
      detectedPatterns.push(category);
      highStressScore += weight;
    }
  }

  // If crisis language detected (weight 4), intervene immediately
  if (highStressScore >= 4) {
    return {
      stressLevel: 'crisis',
      shouldIntervene: true,
      detectedPatterns,
      exercise: REGULATION_EXERCISES.grounding5421,
      reasoning: 'Crisis language detected in message',
    };
  }

  // If panic/high distress detected (weight 2+), intervene
  if (highStressScore >= 2) {
    return {
      stressLevel: 'high',
      shouldIntervene: true,
      detectedPatterns,
      exercise: REGULATION_EXERCISES.gardenBreathing,
      reasoning: 'Acute stress pattern detected',
    };
  }

  // 3. CUMULATIVE STRESS DETECTION: Analyze recent message history
  // Count stress signals in last 5 user messages
  const recentUserMessages = recentHistory
    .filter((m) => m.role === 'USER' || m.role === 'user')
    .slice(-5);

  for (const historicalMsg of recentUserMessages) {
    let messageHasStress = false;
    
    // Check for medium-stress patterns
    for (const { pattern, category } of MEDIUM_STRESS_PATTERNS) {
      if (pattern.test(historicalMsg.content)) {
        if (!messageHasStress) {
          cumulativeStressCount++;
          messageHasStress = true;
        }
        if (!detectedPatterns.includes(`historical_${category}`)) {
          detectedPatterns.push(`historical_${category}`);
        }
      }
    }
    
    // Check for high-stress patterns in history
    for (const { pattern, category } of HIGH_STRESS_PATTERNS) {
      if (pattern.test(historicalMsg.content)) {
        if (!messageHasStress) {
          cumulativeStressCount++;
          messageHasStress = true;
        }
        if (!detectedPatterns.includes(`historical_${category}`)) {
          detectedPatterns.push(`historical_${category}`);
        }
      }
    }
  }

  // 4. DETERMINE STRESS LEVEL: Based on regulation level and cumulative signals
  
  // CRISIS: Regulation < 30 (already handled above)
  
  // HIGH: 3+ stress signals in recent history OR regulation < 40
  if (cumulativeStressCount >= 3 || currentRegulationLevel < 40) {
    return {
      stressLevel: 'high',
      shouldIntervene: true,
      detectedPatterns,
      exercise: REGULATION_EXERCISES.gardenSensory,
      reasoning: cumulativeStressCount >= 3 
        ? 'Multiple stress signals in recent history' 
        : 'Regulation level moderately low (< 40)',
    };
  }
  
  // MEDIUM: 2+ stress signals OR regulation < 60
  if (cumulativeStressCount >= 2 || currentRegulationLevel < 60) {
    return {
      stressLevel: 'medium',
      shouldIntervene: false,
      detectedPatterns,
      reasoning: 'Moderate stress detected, monitoring',
    };
  }
  
  // LOW: Otherwise
  return {
    stressLevel: 'low',
    shouldIntervene: false,
    detectedPatterns,
    reasoning: 'No significant stress detected',
  };
}

/**
 * Formats a regulation intervention message for display.
 * 
 * @param exercise - The regulation exercise to present
 * @returns Formatted markdown message
 */
export function formatInterventionMessage(exercise: RegulationExercise): string {
  const lines = [
    'I notice you might be feeling overwhelmed right now. **Let\'s pause the learning and focus on getting you back to feeling settled.**',
    '',
    '---',
    '',
    `## ${exercise.emoji} ${exercise.title}`,
    '',
  ];

  // Add instructions with proper numbering
  exercise.instructions.forEach((instruction, index) => {
    lines.push(`${index + 1}. ${instruction}`);
    lines.push('');
  });

  lines.push('---');
  lines.push('');
  lines.push(exercise.closingPrompt);

  return lines.join('\n');
}
