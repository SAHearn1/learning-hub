import { db } from '../db';
import type { BloomsLevel, Subject } from '@prisma/client';
import { getStudentAbility, updateStudentAbility, estimateAbilityMLE, type ResponsePattern } from '../irt/ability-estimation';
import { probabilityCorrect } from '../irt/ability-estimation';

export interface ProgressUpdate {
  studentId: string;
  standardId: string;
  tenantId: string;
  assessmentScore: number;
  bloomsLevel: BloomsLevel;
  difficulty: number;
  assessmentId?: string;
  subject?: Subject;
}

export async function updateProgress(update: ProgressUpdate): Promise<void> {
  const { studentId, standardId, tenantId, assessmentScore, bloomsLevel, difficulty, assessmentId, subject } = update;

  // Get current progress
  const currentProgress = await db.progress.findUnique({
    where: {
      studentId_standardId: {
        studentId,
        standardId,
      },
    },
  });

  // Try IRT-enhanced mastery calculation if subject is provided
  let newMasteryLevel: number;

  if (subject && assessmentId) {
    newMasteryLevel = await calculateIRTEnhancedMastery(
      studentId,
      standardId,
      subject,
      assessmentScore,
      bloomsLevel,
      difficulty,
      currentProgress?.masteryLevel || 0,
      currentProgress?.assessmentCount || 0
    );
  } else {
    // Fallback to traditional calculation
    newMasteryLevel = calculateNewMasteryLevel(
      currentProgress?.masteryLevel || 0,
      currentProgress?.assessmentCount || 0,
      assessmentScore,
      bloomsLevel,
      difficulty
    );
  }

  // Update or create progress
  await db.progress.upsert({
    where: {
      studentId_standardId: {
        studentId,
        standardId,
      },
    },
    update: {
      masteryLevel: newMasteryLevel,
      assessmentCount: {
        increment: 1,
      },
      lastAssessedAt: new Date(),
    },
    create: {
      tenantId,
      studentId,
      standardId,
      masteryLevel: newMasteryLevel,
      assessmentCount: 1,
      lastAssessedAt: new Date(),
    },
  });
}

function calculateNewMasteryLevel(
  currentMastery: number,
  assessmentCount: number,
  newScore: number,
  bloomsLevel: BloomsLevel,
  difficulty: number
): number {
  // Weight recent assessments more heavily (exponential moving average)
  const alpha = 0.3; // Weight for new score

  // Adjust score based on Bloom's level and difficulty
  const bloomsMultiplier = getBloomsMultiplier(bloomsLevel);
  const difficultyMultiplier = difficulty / 5; // Normalize to 0-1

  const adjustedScore = newScore * bloomsMultiplier * difficultyMultiplier;

  // If this is the first assessment, use the adjusted score directly
  if (assessmentCount === 0) {
    return Math.min(100, adjustedScore);
  }

  // Otherwise, use exponential moving average
  const newMastery = alpha * adjustedScore + (1 - alpha) * currentMastery;

  return Math.min(100, Math.round(newMastery * 100) / 100);
}

function getBloomsMultiplier(bloomsLevel: BloomsLevel): number {
  const multipliers: Record<BloomsLevel, number> = {
    REMEMBER: 0.8,
    UNDERSTAND: 0.9,
    APPLY: 1.0,
    ANALYZE: 1.1,
    EVALUATE: 1.2,
    CREATE: 1.3,
  };

  return multipliers[bloomsLevel] || 1.0;
}

export function determineMasteryStatus(masteryLevel: number): {
  status: 'NOT_STARTED' | 'EMERGING' | 'DEVELOPING' | 'PROFICIENT' | 'MASTERED';
  color: string;
  description: string;
} {
  if (masteryLevel === 0) {
    return {
      status: 'NOT_STARTED',
      color: 'gray',
      description: 'Not yet assessed',
    };
  } else if (masteryLevel < 50) {
    return {
      status: 'EMERGING',
      color: 'red',
      description: 'Beginning to understand',
    };
  } else if (masteryLevel < 70) {
    return {
      status: 'DEVELOPING',
      color: 'yellow',
      description: 'Developing understanding',
    };
  } else if (masteryLevel < 85) {
    return {
      status: 'PROFICIENT',
      color: 'blue',
      description: 'Proficient',
    };
  } else {
    return {
      status: 'MASTERED',
      color: 'green',
      description: 'Mastered',
    };
  }
}

export async function calculateTopicMastery(
  studentId: string,
  topicId: string
): Promise<{ overallMastery: number; standardMasteries: Record<string, number> }> {
  // Get all standards for this topic
  const topic = await db.topic.findUnique({
    where: { id: topicId },
    include: {
      standards: true,
    },
  });

  if (!topic) {
    throw new Error('Topic not found');
  }

  // Get progress for each standard
  const standardMasteries: Record<string, number> = {};
  let totalMastery = 0;
  let standardCount = 0;

  for (const standard of topic.standards) {
    const progress = await db.progress.findUnique({
      where: {
        studentId_standardId: {
          studentId,
          standardId: standard.id,
        },
      },
    });

    const mastery = progress?.masteryLevel || 0;
    standardMasteries[standard.id] = mastery;
    totalMastery += mastery;
    standardCount++;
  }

  const overallMastery = standardCount > 0 ? totalMastery / standardCount : 0;

  return {
    overallMastery: Math.round(overallMastery * 100) / 100,
    standardMasteries,
  };
}

/**
 * IRT-Enhanced Mastery Calculation
 * Uses student ability (theta) and item difficulty parameters for more accurate mastery estimation
 */
async function calculateIRTEnhancedMastery(
  studentId: string,
  standardId: string,
  subject: Subject,
  assessmentScore: number,
  bloomsLevel: BloomsLevel,
  difficulty: number,
  currentMastery: number,
  assessmentCount: number
): Promise<number> {
  // Get or calculate student ability
  let studentAbility = await getStudentAbility(studentId, subject);

  // If no ability estimate exists, use traditional calculation initially
  if (!studentAbility) {
    return calculateNewMasteryLevel(currentMastery, assessmentCount, assessmentScore, bloomsLevel, difficulty);
  }

  const theta = studentAbility.theta;

  // Convert mastery level (0-100) to theta scale (-3 to +3)
  // Mastery 0 = theta -3, Mastery 50 = theta 0, Mastery 100 = theta 3
  const thetaFromMastery = (currentMastery - 50) / 16.67;

  // Convert assessment difficulty (1-10) to IRT difficulty scale (-3 to +3)
  const irtDifficulty = (difficulty - 5.5) / 1.5;

  // Calculate expected probability of success based on IRT
  const expectedProb = probabilityCorrect(theta, {
    difficulty: irtDifficulty,
    discrimination: 1.0,
    guessing: 0,
    model: 'TWO_PL'
  });

  // Adjust mastery based on performance relative to expectation
  // If student performed better than expected, increase mastery more
  // If student performed worse, decrease mastery
  const performanceRatio = (assessmentScore / 100) / expectedProb;

  // Bloom's level adjustment
  const bloomsMultiplier = getBloomsMultiplier(bloomsLevel);

  // Calculate mastery adjustment
  let masteryChange: number;
  if (performanceRatio > 1.2) {
    // Significantly better than expected
    masteryChange = 15 * bloomsMultiplier;
  } else if (performanceRatio > 1.0) {
    // Better than expected
    masteryChange = 10 * bloomsMultiplier;
  } else if (performanceRatio > 0.8) {
    // About as expected
    masteryChange = 5 * bloomsMultiplier;
  } else if (performanceRatio > 0.6) {
    // Worse than expected
    masteryChange = -5;
  } else {
    // Much worse than expected
    masteryChange = -10;
  }

  // Apply exponential moving average with mastery change
  const alpha = 0.3;
  const newScore = Math.min(100, Math.max(0, currentMastery + masteryChange));
  const newMastery = assessmentCount === 0
    ? newScore
    : alpha * newScore + (1 - alpha) * currentMastery;

  return Math.min(100, Math.max(0, Math.round(newMastery * 100) / 100));
}

/**
 * Calculate mastery level from student theta
 * Converts IRT ability scale (-3 to +3) to mastery percentage (0-100)
 */
export function thetaToMastery(theta: number): number {
  // Linear mapping: theta -3 = 0%, theta 0 = 50%, theta +3 = 100%
  const mastery = 50 + (theta * 16.67);
  return Math.min(100, Math.max(0, Math.round(mastery * 100) / 100));
}

/**
 * Calculate theta from mastery level
 * Converts mastery percentage (0-100) to IRT ability scale (-3 to +3)
 */
export function masteryToTheta(mastery: number): number {
  return (mastery - 50) / 16.67;
}

export function recommendNextStandard(
  currentMasteries: Record<string, number>,
  prerequisites: Record<string, string[]> // standardId -> prerequisite standardIds
): string | null {
  // Find standards that:
  // 1. Have all prerequisites mastered (>= 70%)
  // 2. Are not yet mastered themselves
  // 3. Are closest to being ready

  const candidates: Array<{ id: string; readiness: number }> = [];

  for (const [standardId, mastery] of Object.entries(currentMasteries)) {
    // Skip if already mastered
    if (mastery >= 70) continue;

    const prereqs = prerequisites[standardId] || [];

    // Check if all prerequisites are met
    const prereqsMet = prereqs.every((prereqId) => {
      const prereqMastery = currentMasteries[prereqId] || 0;
      return prereqMastery >= 70;
    });

    if (prereqsMet) {
      // Calculate readiness score based on current mastery and prereq masteries
      const prereqAvg =
        prereqs.length > 0
          ? prereqs.reduce((sum, prereqId) => sum + (currentMasteries[prereqId] || 0), 0) / prereqs.length
          : 0;

      const readiness = mastery * 0.3 + prereqAvg * 0.7;
      candidates.push({ id: standardId, readiness });
    }
  }

  // Sort by readiness (highest first) and return the top candidate
  candidates.sort((a, b) => b.readiness - a.readiness);

  return candidates.length > 0 ? candidates[0].id : null;
}
