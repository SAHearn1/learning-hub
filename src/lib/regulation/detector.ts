import type { Message } from '@prisma/client';

export interface RegulationState {
  level: number; // 0-100, higher = more regulated
  signals: string[];
  interventionCount: number;
  lastChecked: Date;
}

export interface RegulationCheck {
  signals: string[];
  severity: 'low' | 'medium' | 'high';
  recommendation: 'continue' | 'check-in' | 'calm-corner';
}

interface MessageHistory {
  role: string;
  content: string;
  createdAt: Date;
}

export function detectDysregulation(
  message: string,
  history: MessageHistory[]
): RegulationCheck {
  const signals: string[] = [];

  // Short/minimal engagement pattern
  const recentUserMessages = history
    .filter((m) => m.role === 'USER')
    .slice(-3);
  
  if (
    message.length < 3 &&
    recentUserMessages.length >= 2 &&
    recentUserMessages.every((m) => m.content.length < 5)
  ) {
    signals.push('minimal_engagement');
  }

  // Excessive punctuation indicating heightened emotion
  if (/[!?]{3,}/.test(message)) {
    signals.push('heightened_emotion');
  }

  // ALL CAPS (more than 50% of letters)
  const letters = message.replace(/[^a-zA-Z]/g, '');
  const upperCount = message.replace(/[^A-Z]/g, '').length;
  if (letters.length > 3 && upperCount / letters.length > 0.5) {
    signals.push('excessive_caps');
  }

  // Negative self-talk
  const negativePatterns = [
    /i\s+(hate|can't|cannot|suck|stupid|dumb)/i,
    /this\s+is\s+(stupid|dumb|impossible|too\s+hard)/i,
    /i('m|\s+am)\s+(stupid|dumb|bad\s+at)/i,
    /i\s+don't\s+get\s+(it|this|any)/i,
  ];
  
  if (negativePatterns.some((pattern) => pattern.test(message))) {
    signals.push('negative_language');
  }

  // Confusion indicators
  const confusionPatterns = [
    /what\?*$/i,
    /huh\?*$/i,
    /i\s+don't\s+understand/i,
    /confused/i,
  ];
  
  if (confusionPatterns.some((pattern) => pattern.test(message))) {
    signals.push('confusion');
  }

  // Off-topic/avoidance (very short responses not engaging with content)
  if (message.length < 10 && /^(idk|whatever|nah|no|ok|fine)$/i.test(message.trim())) {
    signals.push('disengagement');
  }

  // Calculate severity based on number and type of signals
  const highPrioritySignals = ['negative_language', 'excessive_caps', 'minimal_engagement'];
  const hasHighPriority = signals.some((s) => highPrioritySignals.includes(s));
  
  let severity: 'low' | 'medium' | 'high';
  if (hasHighPriority && signals.length >= 2) {
    severity = 'high';
  } else if (signals.length >= 3) {
    severity = 'high';
  } else if (signals.length >= 2) {
    severity = 'medium';
  } else {
    severity = 'low';
  }

  // Determine recommendation
  const recommendation =
    severity === 'high'
      ? 'calm-corner'
      : severity === 'medium'
        ? 'check-in'
        : 'continue';

  return { signals, severity, recommendation };
}

export function updateRegulationLevel(
  currentLevel: number,
  check: RegulationCheck
): number {
  // Decrease regulation level based on severity
  const decrease =
    check.severity === 'high' ? 15 : check.severity === 'medium' ? 8 : 0;

  // Gradually recover if no issues
  const recovery = check.signals.length === 0 ? 5 : 0;

  const newLevel = Math.max(0, Math.min(100, currentLevel - decrease + recovery));
  return newLevel;
}
