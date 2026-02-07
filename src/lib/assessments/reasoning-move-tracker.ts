import { db } from '../db';
import type { ReasoningMove } from '@prisma/client';

export interface ReasoningMoveUpdate {
  studentId: string;
  move: ReasoningMove;
  wasPrompted: boolean;
}

export async function trackReasoningMove(update: ReasoningMoveUpdate): Promise<void> {
  const { studentId, move, wasPrompted } = update;

  // Get or create reasoning move progress
  const progress = await db.reasoningMoveProgress.findUnique({
    where: {
      studentId_move: {
        studentId,
        move,
      },
    },
  });

  if (progress) {
    // Update existing progress
    await db.reasoningMoveProgress.update({
      where: {
        studentId_move: {
          studentId,
          move,
        },
      },
      data: {
        usageCount: {
          increment: 1,
        },
        promptedUsage: wasPrompted
          ? {
              increment: 1,
            }
          : undefined,
        spontaneousUsage: !wasPrompted
          ? {
              increment: 1,
            }
          : undefined,
        proficiencyLevel: calculateNewProficiency(
          progress.usageCount + 1,
          progress.promptedUsage + (wasPrompted ? 1 : 0),
          progress.spontaneousUsage + (!wasPrompted ? 1 : 0)
        ),
      },
    });
  } else {
    // Create new progress tracking
    await db.reasoningMoveProgress.create({
      data: {
        studentId,
        move,
        introducedAt: new Date(),
        usageCount: 1,
        promptedUsage: wasPrompted ? 1 : 0,
        spontaneousUsage: wasPrompted ? 0 : 1,
        proficiencyLevel: 1,
      },
    });
  }
}

function calculateNewProficiency(
  totalUsage: number,
  promptedUsage: number,
  spontaneousUsage: number
): number {
  // Proficiency level (1-5) based on:
  // 1. Total usage count
  // 2. Ratio of spontaneous to prompted usage

  const spontaneousRatio = totalUsage > 0 ? spontaneousUsage / totalUsage : 0;

  // Level thresholds based on usage and spontaneity
  if (totalUsage < 3) return 1; // Introduced
  if (totalUsage < 8) return 2; // Practicing

  // For higher levels, consider spontaneous usage
  if (spontaneousRatio < 0.3) return 2; // Still needs prompting
  if (spontaneousRatio < 0.5) return 3; // Developing
  if (totalUsage < 15) return 3; // Need more practice

  if (spontaneousRatio < 0.7) return 4; // Proficient
  if (totalUsage < 25) return 4; // Need more consistent use

  return 5; // Mastered - consistent spontaneous use
}

export async function getStudentReasoningProfile(studentId: string) {
  const allMoves = await db.reasoningMoveProgress.findMany({
    where: { studentId },
    orderBy: { proficiencyLevel: 'desc' },
  });

  const movesByLevel = {
    mastered: allMoves.filter((m) => m.proficiencyLevel >= 5),
    proficient: allMoves.filter((m) => m.proficiencyLevel === 4),
    developing: allMoves.filter((m) => m.proficiencyLevel === 3),
    practicing: allMoves.filter((m) => m.proficiencyLevel === 2),
    introduced: allMoves.filter((m) => m.proficiencyLevel === 1),
  };

  const totalUsage = allMoves.reduce((sum, m) => sum + m.usageCount, 0);
  const spontaneousTotal = allMoves.reduce((sum, m) => sum + m.spontaneousUsage, 0);
  const spontaneousRate = totalUsage > 0 ? (spontaneousTotal / totalUsage) * 100 : 0;

  return {
    movesByLevel,
    statistics: {
      totalMovesIntroduced: allMoves.length,
      totalUsage,
      spontaneousRate: Math.round(spontaneousRate),
      averageProficiency:
        allMoves.length > 0
          ? allMoves.reduce((sum, m) => sum + m.proficiencyLevel, 0) / allMoves.length
          : 0,
    },
  };
}

export function suggestNextReasoningMoves(
  currentProfile: Awaited<ReturnType<typeof getStudentReasoningProfile>>,
  currentTopic?: string
): ReasoningMove[] {
  const ALL_MOVES: ReasoningMove[] = [
    'DECOMPOSE',
    'IDENTIFY',
    'COMPARE',
    'CLASSIFY',
    'SEQUENCE',
    'CAUSE_EFFECT',
    'QUESTION',
    'CHALLENGE',
    'VERIFY',
    'JUSTIFY',
    'CRITIQUE',
    'WEIGH',
    'HYPOTHESIZE',
    'CONNECT',
    'GENERALIZE',
    'SPECIALIZE',
    'TRANSFORM',
    'CREATE',
    'MONITOR',
    'ADJUST',
    'REFLECT',
    'PLAN',
  ];

  // Get moves already introduced
  const introducedMoves = new Set(
    Object.values(currentProfile.movesByLevel)
      .flat()
      .map((m) => m.move)
  );

  // Foundation moves that should be introduced early
  const foundationMoves: ReasoningMove[] = ['IDENTIFY', 'DECOMPOSE', 'SEQUENCE', 'VERIFY', 'JUSTIFY'];

  // Intermediate moves
  const intermediateMoves: ReasoningMove[] = [
    'COMPARE',
    'CLASSIFY',
    'CAUSE_EFFECT',
    'QUESTION',
    'CONNECT',
    'MONITOR',
  ];

  // Advanced moves
  const advancedMoves: ReasoningMove[] = [
    'CHALLENGE',
    'CRITIQUE',
    'WEIGH',
    'HYPOTHESIZE',
    'GENERALIZE',
    'SPECIALIZE',
    'TRANSFORM',
    'CREATE',
    'ADJUST',
    'REFLECT',
    'PLAN',
  ];

  // Determine student's level based on current profile
  const masteredCount = currentProfile.movesByLevel.mastered.length;
  const proficientCount = currentProfile.movesByLevel.proficient.length;

  let candidateMoves: ReasoningMove[];

  if (masteredCount + proficientCount < 3) {
    // Focus on foundation moves
    candidateMoves = foundationMoves.filter((m) => !introducedMoves.has(m));
  } else if (masteredCount + proficientCount < 8) {
    // Introduce intermediate moves
    candidateMoves = intermediateMoves.filter((m) => !introducedMoves.has(m));
  } else {
    // Introduce advanced moves
    candidateMoves = advancedMoves.filter((m) => !introducedMoves.has(m));
  }

  // Return top 3 suggestions
  return candidateMoves.slice(0, 3);
}

export const REASONING_MOVE_DESCRIPTIONS: Record<ReasoningMove, string> = {
  DECOMPOSE: 'Break complex problems into smaller, manageable parts',
  IDENTIFY: 'Recognize and name key elements, patterns, or concepts',
  COMPARE: 'Find similarities and differences between ideas or approaches',
  CLASSIFY: 'Group items by common characteristics or categories',
  SEQUENCE: 'Arrange steps, events, or ideas in logical order',
  CAUSE_EFFECT: 'Identify and explain cause-and-effect relationships',
  QUESTION: 'Ask clarifying questions to deepen understanding',
  CHALLENGE: 'Question assumptions and examine beliefs critically',
  VERIFY: 'Check work for accuracy and validate reasoning',
  JUSTIFY: 'Provide evidence and reasoning to support claims',
  CRITIQUE: 'Evaluate arguments and identify strengths and weaknesses',
  WEIGH: 'Consider trade-offs and compare alternatives',
  HYPOTHESIZE: 'Form predictions and test them',
  CONNECT: 'Link new knowledge to prior understanding',
  GENERALIZE: 'Extend patterns and principles to new situations',
  SPECIALIZE: 'Apply general principles to specific cases',
  TRANSFORM: 'Represent ideas in different forms (visual, symbolic, verbal)',
  CREATE: 'Generate new ideas, solutions, or approaches',
  MONITOR: 'Track and assess your own understanding',
  ADJUST: 'Modify strategies when they\'re not working',
  REFLECT: 'Think about your own thinking process (metacognition)',
  PLAN: 'Strategize and organize your approach before acting',
};
