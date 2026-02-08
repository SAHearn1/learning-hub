/**
 * Client-side dysregulation signal detection.
 * Analyzes student message patterns and content for signs of distress,
 * frustration, or disengagement per the RootWork Framework.
 */

interface DysregulationSignal {
  type: string;
  severity: number; // 1-3 (low, medium, high)
  description: string;
}

interface DysregulationAnalysis {
  signals: DysregulationSignal[];
  regulationDelta: number; // How much to decrease regulation level
  shouldTriggerIntervention: boolean;
}

const NEGATIVE_SELF_TALK_PATTERNS = [
  /i('m|\s+am)\s+(so\s+)?stupid/i,
  /i\s+can'?t\s+do\s+this/i,
  /i('m|\s+am)\s+(so\s+)?dumb/i,
  /i\s+hate\s+(this|math|science|school|myself)/i,
  /i('m|\s+am)\s+never\s+going\s+to\s+get\s+(this|it)/i,
  /i\s+give\s+up/i,
  /this\s+is\s+(so\s+)?(impossible|hopeless)/i,
  /i('m|\s+am)\s+not\s+smart\s+enough/i,
  /i\s+suck\s+at\s+this/i,
  /what('s|\s+is)\s+the\s+point/i,
  /i\s+don'?t\s+care\s+anymore/i,
];

const AVOIDANCE_PATTERNS = [
  /^(idk|i\s*don'?t\s*know|whatever|nothing|nm|nvm)$/i,
  /can\s+we\s+(just\s+)?stop/i,
  /i\s+don'?t\s+want\s+to/i,
  /this\s+is\s+boring/i,
  /why\s+do\s+(i|we)\s+(have|need)\s+to/i,
];

export function detectDysregulation(
  message: string,
  recentMessages: { role: string; content: string; timestamp: Date }[],
): DysregulationAnalysis {
  const signals: DysregulationSignal[] = [];

  // Check for ALL CAPS (aggressive punctuation)
  const wordsInMessage = message.trim().split(/\s+/);
  const capsWords = wordsInMessage.filter(
    (w) => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w),
  );
  if (capsWords.length >= 3 || (wordsInMessage.length > 0 && capsWords.length / wordsInMessage.length > 0.5)) {
    signals.push({
      type: 'aggressive_punctuation',
      severity: 2,
      description: 'Message contains significant ALL CAPS text',
    });
  }

  // Check for excessive punctuation (!!!, ???, etc.)
  if (/[!?]{3,}/.test(message)) {
    signals.push({
      type: 'aggressive_punctuation',
      severity: 1,
      description: 'Excessive exclamation or question marks',
    });
  }

  // Check for negative self-talk
  for (const pattern of NEGATIVE_SELF_TALK_PATTERNS) {
    if (pattern.test(message)) {
      signals.push({
        type: 'negative_self_talk',
        severity: 3,
        description: 'Student expressed negative self-talk',
      });
      break;
    }
  }

  // Check for avoidance/deflection
  for (const pattern of AVOIDANCE_PATTERNS) {
    if (pattern.test(message)) {
      signals.push({
        type: 'avoidance',
        severity: 2,
        description: 'Student showing avoidance or deflection',
      });
      break;
    }
  }

  // Check for rapid short responses (3+ messages under 10 chars in last 5 user messages)
  const recentUserMessages = recentMessages
    .filter((m) => m.role === 'USER')
    .slice(-5);
  const shortResponses = recentUserMessages.filter((m) => m.content.trim().length < 10);
  if (recentUserMessages.length >= 3 && shortResponses.length >= 3) {
    signals.push({
      type: 'rapid_short_responses',
      severity: 2,
      description: 'Multiple very short responses detected',
    });
  }

  // Check for rapid message timing (3+ messages within 30 seconds)
  if (recentUserMessages.length >= 3) {
    const lastThree = recentUserMessages.slice(-3);
    const firstTime = new Date(lastThree[0].timestamp).getTime();
    const lastTime = new Date(lastThree[2].timestamp).getTime();
    if (lastTime - firstTime < 30000) {
      signals.push({
        type: 'rapid_responses',
        severity: 1,
        description: 'Rapid-fire messaging detected',
      });
    }
  }

  // Calculate regulation impact
  const regulationDelta = signals.reduce((total, signal) => total + signal.severity * 5, 0);

  // Trigger intervention if high-severity signal or multiple signals
  const hasHighSeverity = signals.some((s) => s.severity >= 3);
  const shouldTriggerIntervention = hasHighSeverity || signals.length >= 2;

  return {
    signals,
    regulationDelta,
    shouldTriggerIntervention,
  };
}

/**
 * Detect TRACE protocol phases in assistant messages.
 * Returns which TRACE step the conversation is currently in.
 */
export type TRACEStep = 'THINK' | 'REASON' | 'ARTICULATE' | 'CHECK' | 'EXTEND' | null;

const TRACE_PATTERNS: { step: TRACEStep; patterns: RegExp[] }[] = [
  {
    step: 'THINK',
    patterns: [
      /what\s+do\s+you\s+notice/i,
      /what\s+stands\s+out/i,
      /what\s+do\s+you\s+see/i,
      /take\s+a\s+look\s+at/i,
      /what\s+information/i,
    ],
  },
  {
    step: 'REASON',
    patterns: [
      /what('s|\s+is)\s+your\s+plan/i,
      /how\s+would\s+you\s+approach/i,
      /what\s+strategy/i,
      /how\s+might\s+you\s+start/i,
      /plan\s+of\s+attack/i,
    ],
  },
  {
    step: 'ARTICULATE',
    patterns: [
      /talk\s+me\s+through/i,
      /walk\s+me\s+through/i,
      /explain\s+your\s+thinking/i,
      /tell\s+me\s+how\s+you/i,
      /describe\s+your\s+(process|reasoning)/i,
    ],
  },
  {
    step: 'CHECK',
    patterns: [
      /how\s+do\s+you\s+know\s+you('re|\s+are)\s+right/i,
      /can\s+you\s+verify/i,
      /check\s+your\s+(work|answer)/i,
      /does\s+that\s+make\s+sense/i,
      /how\s+can\s+you\s+be\s+sure/i,
    ],
  },
  {
    step: 'EXTEND',
    patterns: [
      /what\s+else\s+could\s+you/i,
      /where\s+else\s+might/i,
      /how\s+could\s+you\s+use\s+this/i,
      /can\s+you\s+think\s+of\s+another/i,
      /what\s+if\s+we\s+changed/i,
    ],
  },
];

export function detectTRACEStep(assistantMessage: string): TRACEStep {
  for (const { step, patterns } of TRACE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(assistantMessage)) {
        return step;
      }
    }
  }
  return null;
}
