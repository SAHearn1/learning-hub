/**
 * Adaptive Item Selection for Computer Adaptive Testing (CAT)
 *
 * Selects the next best item to administer based on:
 * - Student's current ability estimate (theta)
 * - Item information functions
 * - Content balancing constraints
 * - Exposure control
 *
 * Uses Maximum Information Selection by default.
 */

import { prisma } from "@/lib/db";
import type { Subject, BloomsLevel } from "@prisma/client";
import { calculateItemInformation, type ItemParameters } from "./ability-estimation";

export interface AdaptiveSelectionOptions {
  studentId: string;
  subject: Subject;
  currentTheta: number;
  bloomsLevelDistribution?: Partial<Record<BloomsLevel, number>>; // Target % for each level
  excludeAssessmentIds?: string[]; // Already administered items
  targetInformation?: number; // Stop when cumulative information reaches this
  maxExposureRate?: number; // Max proportion of students who can see an item (0-1)
}

export interface SelectedItem {
  assessmentId?: string;
  problemId?: string;
  difficulty: number;
  discrimination: number;
  guessing: number;
  bloomsLevel: BloomsLevel;
  information: number;
  expectedProbability: number;
}

/**
 * Calculate expected probability of correct response
 */
function expectedProbability(theta: number, params: ItemParameters): number {
  const { difficulty, discrimination, guessing, model } = params;

  if (model === "THREE_PL") {
    const twoPlProb = 1 / (1 + Math.exp(-discrimination * (theta - difficulty)));
    return guessing + (1 - guessing) * twoPlProb;
  } else {
    const disc = model === "ONE_PL" ? 1.0 : discrimination;
    return 1 / (1 + Math.exp(-disc * (theta - difficulty)));
  }
}

/**
 * Select next item using Maximum Information criterion
 */
export async function selectNextItem(
  options: AdaptiveSelectionOptions
): Promise<SelectedItem | null> {
  const {
    studentId,
    subject,
    currentTheta,
    bloomsLevelDistribution,
    excludeAssessmentIds = [],
    maxExposureRate = 0.3,
  } = options;

  // Fetch calibrated items from database
  const calibratedItems = await prisma.itemCalibration.findMany({
    where: {
      OR: [
        {
          assessment: {
            standardId: {
              not: null,
            },
            standard: {
              subject,
            },
          },
          itemType: "ASSESSMENT",
          assessmentId: {
            notIn: excludeAssessmentIds,
          },
        },
        {
          problem: {
            topic: {
              subject,
            },
          },
          itemType: "PROBLEM",
        },
      ],
      lastCalibratedAt: {
        not: null,
      },
    },
    include: {
      assessment: {
        include: {
          standard: true,
        },
      },
      problem: {
        include: {
          topic: true,
        },
      },
    },
  });

  if (calibratedItems.length === 0) {
    return null;
  }

  // Calculate information and probability for each item
  const itemsWithInfo = calibratedItems.map((item) => {
    const params: ItemParameters = {
      difficulty: item.irtDifficulty,
      discrimination: item.irtDiscrimination,
      guessing: item.irtGuessing,
      model: item.calibrationModel,
    };

    const information = calculateItemInformation(currentTheta, params);
    const probability = expectedProbability(currentTheta, params);

    return {
      calibration: item,
      params,
      information,
      probability,
      bloomsLevel: item.assessment?.bloomsLevel || item.problem?.bloomsLevel,
    };
  });

  // Filter by Bloom's level distribution if specified
  let filteredItems = itemsWithInfo;
  if (bloomsLevelDistribution) {
    // Get student's assessment history for this subject
    const assessmentHistory = await prisma.assessment.findMany({
      where: {
        session: {
          student: {
            id: studentId,
          },
          subject,
        },
      },
      select: {
        bloomsLevel: true,
      },
    });

    // Calculate current distribution
    const totalCount = assessmentHistory.length;
    const currentDistribution: Record<string, number> = {};

    for (const assessment of assessmentHistory) {
      currentDistribution[assessment.bloomsLevel] =
        (currentDistribution[assessment.bloomsLevel] || 0) + 1;
    }

    // Find which Bloom's level is most under-represented
    let maxDeficit = -Infinity;
    let targetBloomsLevel: BloomsLevel | null = null;

    for (const [level, targetProportion] of Object.entries(bloomsLevelDistribution)) {
      const currentProportion =
        totalCount > 0 ? (currentDistribution[level] || 0) / totalCount : 0;
      const deficit = targetProportion - currentProportion;

      if (deficit > maxDeficit) {
        maxDeficit = deficit;
        targetBloomsLevel = level as BloomsLevel;
      }
    }

    // Prefer items from under-represented Bloom's level
    if (targetBloomsLevel) {
      const targetLevelItems = itemsWithInfo.filter(
        (item) => item.bloomsLevel === targetBloomsLevel
      );

      if (targetLevelItems.length > 0) {
        filteredItems = targetLevelItems;
      }
    }
  }

  // Sort by information (descending) and select top item
  filteredItems.sort((a, b) => b.information - a.information);

  // Apply exposure control: don't always pick the highest information item
  // Use randomized selection from top k items
  const topK = Math.min(5, filteredItems.length);
  const candidateItems = filteredItems.slice(0, topK);

  // Weighted random selection based on information
  const totalInformation = candidateItems.reduce((sum, item) => sum + item.information, 0);
  let random = Math.random() * totalInformation;

  for (const item of candidateItems) {
    random -= item.information;
    if (random <= 0) {
      return {
        assessmentId: item.calibration.assessmentId || undefined,
        problemId: item.calibration.problemId || undefined,
        difficulty: item.params.difficulty,
        discrimination: item.params.discrimination,
        guessing: item.params.guessing,
        bloomsLevel: item.bloomsLevel!,
        information: item.information,
        expectedProbability: item.probability,
      };
    }
  }

  // Fallback: return the highest information item
  const bestItem = filteredItems[0];
  return {
    assessmentId: bestItem.calibration.assessmentId || undefined,
    problemId: bestItem.calibration.problemId || undefined,
    difficulty: bestItem.params.difficulty,
    discrimination: bestItem.params.discrimination,
    guessing: bestItem.params.guessing,
    bloomsLevel: bestItem.bloomsLevel!,
    information: bestItem.information,
    expectedProbability: bestItem.probability,
  };
}

/**
 * Determine if assessment should stop based on measurement precision
 */
export function shouldStopAssessment(
  standardError: number,
  targetSE: number = 0.3,
  minItems: number = 5,
  maxItems: number = 30,
  itemCount: number
): boolean {
  if (itemCount < minItems) {
    return false;
  }

  if (itemCount >= maxItems) {
    return true;
  }

  return standardError <= targetSE;
}

/**
 * Calculate recommended difficulty for next item
 * Items at theta ± 0.5 logits provide good information
 */
export function getRecommendedDifficultyRange(theta: number): {
  min: number;
  max: number;
  optimal: number;
} {
  return {
    min: theta - 0.7,
    max: theta + 0.7,
    optimal: theta, // Items matching ability provide maximum information
  };
}

/**
 * Classify student performance level based on theta
 */
export function classifyAbilityLevel(theta: number): {
  level: string;
  description: string;
  percentile: number;
} {
  // Assuming normal distribution N(0, 1)
  // Convert theta to percentile using standard normal CDF approximation

  const percentile = 50 + 50 * erf(theta / Math.sqrt(2));

  let level: string;
  let description: string;

  if (theta >= 2.0) {
    level = "ADVANCED";
    description = "Significantly above grade level";
  } else if (theta >= 1.0) {
    level = "PROFICIENT_PLUS";
    description = "Above grade level";
  } else if (theta >= 0) {
    level = "PROFICIENT";
    description = "At grade level";
  } else if (theta >= -1.0) {
    level = "DEVELOPING";
    description = "Approaching grade level";
  } else if (theta >= -2.0) {
    level = "EMERGING";
    description = "Below grade level";
  } else {
    level = "BEGINNING";
    description = "Significantly below grade level";
  }

  return {
    level,
    description,
    percentile: Math.round(percentile * 10) / 10,
  };
}

/**
 * Error function approximation for normal CDF
 */
function erf(x: number): number {
  // Abramowitz and Stegun approximation
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

/**
 * Generate adaptive follow-up question difficulty
 * If student answered correctly, increase difficulty
 * If student answered incorrectly, decrease difficulty
 */
export function adaptDifficulty(
  currentDifficulty: number,
  isCorrect: boolean,
  adaptationRate: number = 0.5
): number {
  if (isCorrect) {
    // Increase difficulty
    return Math.min(3, currentDifficulty + adaptationRate);
  } else {
    // Decrease difficulty
    return Math.max(-3, currentDifficulty - adaptationRate);
  }
}
