/**
 * Item Calibration using IRT
 *
 * Calibrates item parameters (difficulty, discrimination, guessing) from response data.
 * Uses marginal maximum likelihood estimation (MMLE) and EM algorithm.
 *
 * For production use, consider using specialized IRT software like:
 * - mirt (R package)
 * - TAM (R package)
 * - PyIRT (Python)
 *
 * This implementation provides a simplified calibration for real-time updates.
 */

import { db as prisma } from "@/lib/db";
import type { IRTModel } from "@prisma/client";
import {
  estimateAbilityMLE,
  type ResponsePattern,
  type ItemParameters,
} from "./ability-estimation";
import { glicko2ToIRTDifficulty, type Glicko2Result } from "./glicko2";

export interface CalibrationResult {
  difficulty: number;
  discrimination: number;
  guessing: number;
  standardError: number;
  itemInformation: number;
  sampleSize: number;
}

/**
 * Simple item calibration using classical test theory (CTT)
 * Provides initial estimates before full IRT calibration
 */
export function calibrateItemCTT(
  responses: { studentAbility: number; isCorrect: boolean }[]
): CalibrationResult {
  if (responses.length < 10) {
    // Not enough data for reliable calibration
    return {
      difficulty: 0,
      discrimination: 1.0,
      guessing: 0,
      standardError: 1.0,
      itemInformation: 0.25,
      sampleSize: responses.length,
    };
  }

  const n = responses.length;
  const pValue = responses.filter((r) => r.isCorrect).length / n;

  // Estimate difficulty from p-value using logit transform
  // p = 1 / (1 + exp(-a(θ - b)))
  // Assuming average ability θ = 0 and a = 1:
  // b = -log((1 - p) / p)
  const clampedP = Math.max(0.01, Math.min(0.99, pValue));
  const difficulty = -Math.log((1 - clampedP) / clampedP);

  // Estimate discrimination using point-biserial correlation
  const meanAbilityCorrect =
    responses.filter((r) => r.isCorrect).reduce((sum, r) => sum + r.studentAbility, 0) /
    Math.max(1, responses.filter((r) => r.isCorrect).length);

  const meanAbilityIncorrect =
    responses.filter((r) => !r.isCorrect).reduce((sum, r) => sum + r.studentAbility, 0) /
    Math.max(1, responses.filter((r) => !r.isCorrect).length);

  const sdAbility = Math.sqrt(
    responses.reduce((sum, r) => sum + Math.pow(r.studentAbility, 2), 0) / n -
      Math.pow(
        responses.reduce((sum, r) => sum + r.studentAbility, 0) / n,
        2
      )
  );

  const discrimination =
    sdAbility > 0 ? Math.abs((meanAbilityCorrect - meanAbilityIncorrect) / sdAbility) : 1.0;

  // Ensure discrimination is reasonable
  const clampedDiscrimination = Math.max(0.2, Math.min(2.5, discrimination));

  // Calculate item information at difficulty point
  const itemInformation = clampedDiscrimination * clampedDiscrimination * 0.25; // max at p=0.5

  return {
    difficulty,
    discrimination: clampedDiscrimination,
    guessing: 0,
    standardError: 1.0 / Math.sqrt(n),
    itemInformation,
    sampleSize: n,
  };
}

/**
 * Calibrate item using 2PL IRT model
 * Uses iterative procedure to estimate difficulty and discrimination
 */
export function calibrateItem2PL(
  responses: { studentAbility: number; isCorrect: boolean }[],
  maxIterations: number = 100,
  tolerance: number = 0.001
): CalibrationResult {
  if (responses.length < 30) {
    // Fall back to CTT for small samples
    return calibrateItemCTT(responses);
  }

  // Initialize with CTT estimates
  let { difficulty, discrimination } = calibrateItemCTT(responses);

  // Newton-Raphson iterations for 2PL
  for (let iter = 0; iter < maxIterations; iter++) {
    let dLogL_b = 0; // Derivative w.r.t. difficulty
    let dLogL_a = 0; // Derivative w.r.t. discrimination
    let d2LogL_bb = 0; // Second derivative w.r.t. difficulty
    let d2LogL_aa = 0; // Second derivative w.r.t. discrimination
    let d2LogL_ab = 0; // Cross derivative

    for (const response of responses) {
      const theta = response.studentAbility;
      const prob = 1 / (1 + Math.exp(-discrimination * (theta - difficulty)));
      const q = 1 - prob;

      if (response.isCorrect) {
        dLogL_b += -discrimination * q;
        dLogL_a += -(theta - difficulty) * q;
      } else {
        dLogL_b += discrimination * prob;
        dLogL_a += (theta - difficulty) * prob;
      }

      // Information matrix (negative second derivatives)
      d2LogL_bb += discrimination * discrimination * prob * q;
      d2LogL_aa += (theta - difficulty) * (theta - difficulty) * prob * q;
      d2LogL_ab += discrimination * (theta - difficulty) * prob * q;
    }

    // Newton-Raphson update using information matrix inversion
    const det = d2LogL_bb * d2LogL_aa - d2LogL_ab * d2LogL_ab;

    if (Math.abs(det) < 1e-10) {
      break; // Singular matrix
    }

    const delta_b = (d2LogL_aa * dLogL_b - d2LogL_ab * dLogL_a) / det;
    const delta_a = (d2LogL_bb * dLogL_a - d2LogL_ab * dLogL_b) / det;

    difficulty += delta_b;
    discrimination += delta_a;

    // Constrain parameters to reasonable ranges
    difficulty = Math.max(-3, Math.min(3, difficulty));
    discrimination = Math.max(0.2, Math.min(2.5, discrimination));

    // Check convergence
    if (Math.abs(delta_b) < tolerance && Math.abs(delta_a) < tolerance) {
      break;
    }
  }

  // Calculate standard error from information matrix
  let information = 0;
  for (const response of responses) {
    const theta = response.studentAbility;
    const prob = 1 / (1 + Math.exp(-discrimination * (theta - difficulty)));
    information += discrimination * discrimination * prob * (1 - prob);
  }

  const standardError = information > 0 ? 1 / Math.sqrt(information) : 1.0;
  const itemInformation = discrimination * discrimination * 0.25;

  return {
    difficulty,
    discrimination,
    guessing: 0,
    standardError,
    itemInformation,
    sampleSize: responses.length,
  };
}

/**
 * Calibrate all items in database that have sufficient response data
 */
export async function calibrateAllItems(
  subject: "MATH" | "SCIENCE" | "LANGUAGE_ARTS",
  minResponses: number = 30
): Promise<{ calibrated: number; skipped: number }> {
  // Get all assessments with responses
  const assessments = await prisma.assessment.findMany({
    where: {
      standard: {
        subject,
      },
      isCorrect: {
        not: null,
      },
    },
    include: {
      session: {
        include: {
          student: {
            include: {
              abilityEstimates: {
                where: {
                  subject,
                },
              },
            },
          },
        },
      },
    },
  });

  // Group responses by question text (since same question can appear multiple times)
  const responsesByQuestion = new Map<
    string,
    { assessmentIds: string[]; responses: { studentAbility: number; isCorrect: boolean }[] }
  >();

  for (const assessment of assessments) {
    const question = assessment.question;
    const studentAbility =
      assessment.session.student.abilityEstimates[0]?.currentTheta ?? 0;
    const isCorrect = assessment.isCorrect ?? false;

    if (!responsesByQuestion.has(question)) {
      responsesByQuestion.set(question, {
        assessmentIds: [],
        responses: [],
      });
    }

    const questionData = responsesByQuestion.get(question)!;
    questionData.assessmentIds.push(assessment.id);
    questionData.responses.push({ studentAbility, isCorrect });
  }

  let calibrated = 0;
  let skipped = 0;

  // Calibrate each unique question
  for (const [question, data] of responsesByQuestion.entries()) {
    if (data.responses.length < minResponses) {
      skipped++;
      continue;
    }

    // Calibrate using 2PL model
    const calibration = calibrateItem2PL(data.responses);

    // Update or create calibration for the first assessment with this question
    const assessmentId = data.assessmentIds[0];

    await prisma.itemCalibration.upsert({
      where: {
        assessmentId,
      },
      update: {
        irtDifficulty: calibration.difficulty,
        irtDiscrimination: calibration.discrimination,
        irtGuessing: calibration.guessing,
        standardError: calibration.standardError,
        itemInformation: calibration.itemInformation,
        sampleSize: calibration.sampleSize,
        lastCalibratedAt: new Date(),
      },
      create: {
        assessmentId,
        itemType: "ASSESSMENT",
        irtDifficulty: calibration.difficulty,
        irtDiscrimination: calibration.discrimination,
        irtGuessing: calibration.guessing,
        calibrationModel: "TWO_PL",
        standardError: calibration.standardError,
        itemInformation: calibration.itemInformation,
        sampleSize: calibration.sampleSize,
        lastCalibratedAt: new Date(),
      },
    });

    calibrated++;
  }

  return { calibrated, skipped };
}

/**
 * Batch update student abilities based on their assessment history
 */
export async function batchUpdateStudentAbilities(
  subject: "MATH" | "SCIENCE" | "LANGUAGE_ARTS"
): Promise<number> {
  // Get all students with assessments in this subject
  const students = await prisma.student.findMany({
    where: {
      sessions: {
        some: {
          subject,
          assessments: {
            some: {
              isCorrect: {
                not: null,
              },
            },
          },
        },
      },
    },
    include: {
      sessions: {
        where: {
          subject,
        },
        include: {
          assessments: {
            where: {
              isCorrect: {
                not: null,
              },
            },
            include: {
              itemCalibration: true,
            },
          },
        },
      },
    },
  });

  let updated = 0;

  for (const student of students) {
    const responses: ResponsePattern[] = [];

    // Collect all responses with calibrated items
    for (const session of student.sessions) {
      for (const assessment of session.assessments) {
        if (assessment.itemCalibration) {
          responses.push({
            itemId: assessment.id,
            isCorrect: assessment.isCorrect ?? false,
            parameters: {
              difficulty: assessment.itemCalibration.irtDifficulty,
              discrimination: assessment.itemCalibration.irtDiscrimination,
              guessing: assessment.itemCalibration.irtGuessing,
              model: assessment.itemCalibration.calibrationModel,
            },
          });
        }
      }
    }

    if (responses.length > 0) {
      // Estimate ability using MLE
      const estimate = estimateAbilityMLE(responses);

      // Update in database
      await prisma.studentAbility.upsert({
        where: {
          studentId_subject: {
            studentId: student.id,
            subject,
          },
        },
        update: {
          currentTheta: estimate.theta,
          standardError: estimate.standardError,
          confidenceIntervalLower: estimate.confidenceIntervalLower,
          confidenceIntervalUpper: estimate.confidenceIntervalUpper,
          reliabilityIndex: estimate.reliabilityIndex,
          assessmentCount: responses.length,
          lastEstimatedAt: new Date(),
        },
        create: {
          studentId: student.id,
          subject,
          currentTheta: estimate.theta,
          standardError: estimate.standardError,
          confidenceIntervalLower: estimate.confidenceIntervalLower,
          confidenceIntervalUpper: estimate.confidenceIntervalUpper,
          reliabilityIndex: estimate.reliabilityIndex,
          assessmentCount: responses.length,
        },
      });

      updated++;
    }
  }

  return updated;
}
