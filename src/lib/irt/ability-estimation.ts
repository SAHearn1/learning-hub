/**
 * Student Ability Estimation using IRT
 *
 * Implements Maximum Likelihood Estimation (MLE) and Expected A Posteriori (EAP)
 * methods for estimating student ability (theta) based on response patterns.
 *
 * IRT assumes that the probability of a correct response is a function of:
 * - Student ability (theta/θ)
 * - Item difficulty (b)
 * - Item discrimination (a)
 * - Item guessing (c) for 3PL model
 */

import { db as prisma } from "@/lib/db";
import type { IRTModel } from "@prisma/client";

export interface ItemParameters {
  difficulty: number; // b parameter
  discrimination: number; // a parameter
  guessing: number; // c parameter (0 for 1PL/2PL)
  model: IRTModel;
}

export interface ResponsePattern {
  itemId: string;
  isCorrect: boolean;
  parameters: ItemParameters;
}

export interface AbilityEstimate {
  theta: number;
  standardError: number;
  confidenceIntervalLower: number;
  confidenceIntervalUpper: number;
  reliabilityIndex: number;
}

/**
 * Calculate probability of correct response using 2PL IRT model
 * P(θ) = 1 / (1 + exp(-a(θ - b)))
 */
export function probabilityCorrect2PL(
  theta: number,
  difficulty: number,
  discrimination: number
): number {
  return 1 / (1 + Math.exp(-discrimination * (theta - difficulty)));
}

/**
 * Calculate probability of correct response using 3PL IRT model
 * P(θ) = c + (1 - c) / (1 + exp(-a(θ - b)))
 */
export function probabilityCorrect3PL(
  theta: number,
  difficulty: number,
  discrimination: number,
  guessing: number
): number {
  const twoPlProb = probabilityCorrect2PL(theta, difficulty, discrimination);
  return guessing + (1 - guessing) * twoPlProb;
}

/**
 * Calculate probability of correct response based on model type
 */
export function probabilityCorrect(theta: number, params: ItemParameters): number {
  switch (params.model) {
    case "ONE_PL":
      return probabilityCorrect2PL(theta, params.difficulty, 1.0);
    case "TWO_PL":
      return probabilityCorrect2PL(theta, params.difficulty, params.discrimination);
    case "THREE_PL":
      return probabilityCorrect3PL(
        theta,
        params.difficulty,
        params.discrimination,
        params.guessing
      );
    default:
      return probabilityCorrect2PL(theta, params.difficulty, params.discrimination);
  }
}

/**
 * Calculate log-likelihood for a given theta
 */
function logLikelihood(theta: number, responses: ResponsePattern[]): number {
  let logL = 0;

  for (const response of responses) {
    const prob = probabilityCorrect(theta, response.parameters);
    const clampedProb = Math.max(0.0001, Math.min(0.9999, prob)); // Prevent log(0)

    if (response.isCorrect) {
      logL += Math.log(clampedProb);
    } else {
      logL += Math.log(1 - clampedProb);
    }
  }

  return logL;
}

/**
 * Calculate first derivative of log-likelihood (score function)
 */
function logLikelihoodDerivative(theta: number, responses: ResponsePattern[]): number {
  let derivative = 0;

  for (const response of responses) {
    const { difficulty, discrimination, guessing, model } = response.parameters;
    const prob = probabilityCorrect(theta, response.parameters);

    let dProb: number;
    if (model === "THREE_PL") {
      // Derivative for 3PL
      const p2pl = probabilityCorrect2PL(theta, difficulty, discrimination);
      dProb = (1 - guessing) * discrimination * p2pl * (1 - p2pl);
    } else {
      // Derivative for 1PL and 2PL
      const disc = model === "ONE_PL" ? 1.0 : discrimination;
      dProb = disc * prob * (1 - prob);
    }

    if (response.isCorrect) {
      derivative += dProb / prob;
    } else {
      derivative -= dProb / (1 - prob);
    }
  }

  return derivative;
}

/**
 * Calculate second derivative of log-likelihood (information)
 */
function logLikelihoodSecondDerivative(theta: number, responses: ResponsePattern[]): number {
  let secondDerivative = 0;

  for (const response of responses) {
    const { difficulty, discrimination, guessing, model } = response.parameters;
    const prob = probabilityCorrect(theta, response.parameters);

    let information: number;
    if (model === "THREE_PL") {
      const p2pl = probabilityCorrect2PL(theta, difficulty, discrimination);
      const dProb = (1 - guessing) * discrimination * p2pl * (1 - p2pl);
      information = (dProb * dProb) / (prob * (1 - prob));
    } else {
      const disc = model === "ONE_PL" ? 1.0 : discrimination;
      information = disc * disc * prob * (1 - prob);
    }

    secondDerivative += information;
  }

  return -secondDerivative;
}

/**
 * Estimate student ability using Maximum Likelihood Estimation (MLE)
 * Uses Newton-Raphson method for optimization
 */
export function estimateAbilityMLE(
  responses: ResponsePattern[],
  initialTheta: number = 0,
  maxIterations: number = 50,
  tolerance: number = 0.001
): AbilityEstimate {
  if (responses.length === 0) {
    return {
      theta: 0,
      standardError: 3,
      confidenceIntervalLower: -6,
      confidenceIntervalUpper: 6,
      reliabilityIndex: 0,
    };
  }

  // Check for perfect scores (all correct or all incorrect)
  const allCorrect = responses.every((r) => r.isCorrect);
  const allIncorrect = responses.every((r) => !r.isCorrect);

  if (allCorrect) {
    // Maximum ability estimate
    return {
      theta: 3,
      standardError: 0.5,
      confidenceIntervalLower: 2,
      confidenceIntervalUpper: 4,
      reliabilityIndex: 0.9,
    };
  }

  if (allIncorrect) {
    // Minimum ability estimate
    return {
      theta: -3,
      standardError: 0.5,
      confidenceIntervalLower: -4,
      confidenceIntervalUpper: -2,
      reliabilityIndex: 0.9,
    };
  }

  let theta = initialTheta;

  // Newton-Raphson iteration
  for (let i = 0; i < maxIterations; i++) {
    const derivative = logLikelihoodDerivative(theta, responses);
    const secondDerivative = logLikelihoodSecondDerivative(theta, responses);

    if (Math.abs(secondDerivative) < 1e-10) {
      break; // Avoid division by zero
    }

    const delta = -derivative / secondDerivative;
    theta += delta;

    // Constrain theta to reasonable range
    theta = Math.max(-4, Math.min(4, theta));

    if (Math.abs(delta) < tolerance) {
      break; // Converged
    }
  }

  // Calculate standard error from Fisher information
  const information = -logLikelihoodSecondDerivative(theta, responses);
  const standardError = information > 0 ? 1 / Math.sqrt(information) : 1;

  // 95% confidence interval
  const confidenceIntervalLower = theta - 1.96 * standardError;
  const confidenceIntervalUpper = theta + 1.96 * standardError;

  // Calculate reliability index
  const reliabilityIndex = information > 0 ? information / (information + 1) : 0;

  return {
    theta,
    standardError,
    confidenceIntervalLower,
    confidenceIntervalUpper,
    reliabilityIndex,
  };
}

/**
 * Estimate student ability using Expected A Posteriori (EAP)
 * Uses Bayesian approach with normal prior N(0, 1)
 */
export function estimateAbilityEAP(
  responses: ResponsePattern[],
  priorMean: number = 0,
  priorSD: number = 1,
  quadraturePoints: number = 49
): AbilityEstimate {
  if (responses.length === 0) {
    return {
      theta: priorMean,
      standardError: priorSD,
      confidenceIntervalLower: priorMean - 1.96 * priorSD,
      confidenceIntervalUpper: priorMean + 1.96 * priorSD,
      reliabilityIndex: 0,
    };
  }

  // Quadrature points from -4 to 4
  const minTheta = -4;
  const maxTheta = 4;
  const step = (maxTheta - minTheta) / (quadraturePoints - 1);

  const quadPoints: number[] = [];
  const likelihoods: number[] = [];
  const priors: number[] = [];

  // Calculate likelihood and prior at each quadrature point
  for (let i = 0; i < quadraturePoints; i++) {
    const theta = minTheta + i * step;
    quadPoints.push(theta);

    // Likelihood
    const likelihood = Math.exp(logLikelihood(theta, responses));
    likelihoods.push(likelihood);

    // Prior (normal distribution)
    const prior = Math.exp(-0.5 * Math.pow((theta - priorMean) / priorSD, 2));
    priors.push(prior);
  }

  // Calculate posterior
  const posteriors = likelihoods.map((l, i) => l * priors[i]);
  const sumPosteriors = posteriors.reduce((sum, p) => sum + p, 0);
  const normalizedPosteriors = posteriors.map((p) => p / sumPosteriors);

  // Calculate EAP estimate (expected value of posterior)
  const theta = quadPoints.reduce(
    (sum, point, i) => sum + point * normalizedPosteriors[i],
    0
  );

  // Calculate posterior standard deviation
  const variance = quadPoints.reduce(
    (sum, point, i) => sum + Math.pow(point - theta, 2) * normalizedPosteriors[i],
    0
  );
  const standardError = Math.sqrt(variance);

  // 95% confidence interval
  const confidenceIntervalLower = theta - 1.96 * standardError;
  const confidenceIntervalUpper = theta + 1.96 * standardError;

  // Reliability
  const reliabilityIndex = 1 - variance / (priorSD * priorSD);

  return {
    theta,
    standardError,
    confidenceIntervalLower,
    confidenceIntervalUpper,
    reliabilityIndex: Math.max(0, reliabilityIndex),
  };
}

/**
 * Update student ability in database
 */
export async function updateStudentAbility(
  studentId: string,
  subject: "MATH" | "SCIENCE" | "LANGUAGE_ARTS" | "FINANCIAL_LITERACY",
  estimate: AbilityEstimate
): Promise<void> {
  await prisma.studentAbility.upsert({
    where: {
      studentId_subject: {
        studentId,
        subject,
      },
    },
    update: {
      currentTheta: estimate.theta,
      standardError: estimate.standardError,
      confidenceIntervalLower: estimate.confidenceIntervalLower,
      confidenceIntervalUpper: estimate.confidenceIntervalUpper,
      reliabilityIndex: estimate.reliabilityIndex,
      assessmentCount: {
        increment: 1,
      },
      lastEstimatedAt: new Date(),
    },
    create: {
      studentId,
      subject,
      currentTheta: estimate.theta,
      standardError: estimate.standardError,
      confidenceIntervalLower: estimate.confidenceIntervalLower,
      confidenceIntervalUpper: estimate.confidenceIntervalUpper,
      reliabilityIndex: estimate.reliabilityIndex,
      assessmentCount: 1,
    },
  });
}

/**
 * Get student's current ability estimate
 */
export async function getStudentAbility(
  studentId: string,
  subject: "MATH" | "SCIENCE" | "LANGUAGE_ARTS" | "FINANCIAL_LITERACY"
): Promise<AbilityEstimate | null> {
  const ability = await prisma.studentAbility.findUnique({
    where: {
      studentId_subject: {
        studentId,
        subject,
      },
    },
  });

  if (!ability) {
    return null;
  }

  return {
    theta: ability.currentTheta,
    standardError: ability.standardError,
    confidenceIntervalLower: ability.confidenceIntervalLower,
    confidenceIntervalUpper: ability.confidenceIntervalUpper,
    reliabilityIndex: ability.reliabilityIndex,
  };
}

/**
 * Calculate item information at a given theta
 * Information indicates how much an item contributes to ability estimation
 */
export function calculateItemInformation(theta: number, params: ItemParameters): number {
  const prob = probabilityCorrect(theta, params);

  if (params.model === "THREE_PL") {
    const p2pl = probabilityCorrect2PL(theta, params.difficulty, params.discrimination);
    const dProb = (1 - params.guessing) * params.discrimination * p2pl * (1 - p2pl);
    return (dProb * dProb) / (prob * (1 - prob));
  } else {
    const disc = params.model === "ONE_PL" ? 1.0 : params.discrimination;
    return disc * disc * prob * (1 - prob);
  }
}

/**
 * Calculate test information (sum of item information)
 */
export function calculateTestInformation(
  theta: number,
  items: ItemParameters[]
): number {
  return items.reduce((sum, item) => sum + calculateItemInformation(theta, item), 0);
}
