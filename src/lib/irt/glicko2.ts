/**
 * Glicko-2 Rating System
 *
 * An advanced rating system for question difficulty calibration.
 * Extends Glicko-1 by adding rating volatility (σ) to track rating stability.
 *
 * Core parameters:
 * - Rating (r): Question difficulty or student ability
 * - Rating Deviation (RD): Uncertainty in the rating
 * - Volatility (σ): Degree of expected fluctuation in rating
 *
 * References:
 * - Glickman, M. E. (2012). "Example of the Glicko-2 system"
 * - http://www.glicko.net/glicko/glicko2.pdf
 */

// Glicko-2 scale parameters
const GLICKO2_SCALE = 173.7178; // Conversion constant (π / √3)
const TAU = 0.5; // System constant (controls volatility change)
const EPSILON = 0.000001; // Convergence tolerance

export interface Glicko2Rating {
  rating: number; // μ (mu) - rating on Glicko-2 scale
  ratingDeviation: number; // φ (phi) - rating deviation on Glicko-2 scale
  volatility: number; // σ (sigma) - rating volatility
}

export interface Glicko2Result {
  opponentRating: number;
  opponentRD: number;
  score: number; // 1 = win, 0.5 = draw, 0 = loss
}

/**
 * Convert traditional rating (1500 scale) to Glicko-2 scale
 */
export function toGlicko2Scale(rating: number, rd: number): { mu: number; phi: number } {
  return {
    mu: (rating - 1500) / GLICKO2_SCALE,
    phi: rd / GLICKO2_SCALE,
  };
}

/**
 * Convert Glicko-2 scale back to traditional rating
 */
export function fromGlicko2Scale(mu: number, phi: number): { rating: number; rd: number } {
  return {
    rating: mu * GLICKO2_SCALE + 1500,
    rd: phi * GLICKO2_SCALE,
  };
}

/**
 * Calculate g(φ) function - reduces impact of games against uncertain opponents
 */
function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

/**
 * Calculate E(μ, μj, φj) - expected score
 */
function E(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

/**
 * Calculate variance of rating based on games played
 */
function calculateVariance(mu: number, results: Glicko2Result[]): number {
  const glicko2Results = results.map((r) => toGlicko2Scale(r.opponentRating, r.opponentRD));

  let sum = 0;
  for (let i = 0; i < results.length; i++) {
    const { mu: muJ, phi: phiJ } = glicko2Results[i];
    const gPhi = g(phiJ);
    const expectedScore = E(mu, muJ, phiJ);
    sum += gPhi * gPhi * expectedScore * (1 - expectedScore);
  }

  return 1 / sum;
}

/**
 * Calculate delta (estimated improvement in rating)
 */
function calculateDelta(mu: number, results: Glicko2Result[]): number {
  const glicko2Results = results.map((r) => toGlicko2Scale(r.opponentRating, r.opponentRD));
  const v = calculateVariance(mu, results);

  let sum = 0;
  for (let i = 0; i < results.length; i++) {
    const { mu: muJ, phi: phiJ } = glicko2Results[i];
    const expectedScore = E(mu, muJ, phiJ);
    sum += g(phiJ) * (results[i].score - expectedScore);
  }

  return v * sum;
}

/**
 * Calculate new volatility using Illinois algorithm
 */
function calculateNewVolatility(
  phi: number,
  sigma: number,
  delta: number,
  v: number
): number {
  const phiSquared = phi * phi;
  const deltaSquared = delta * delta;

  // Step 5.1: Initialize
  const a = Math.log(sigma * sigma);

  // Step 5.2: Define f(x)
  const f = (x: number): number => {
    const eX = Math.exp(x);
    const term1 = (eX * (deltaSquared - phiSquared - v - eX)) / (2 * Math.pow(phiSquared + v + eX, 2));
    const term2 = (x - a) / (TAU * TAU);
    return term1 - term2;
  };

  // Step 5.3: Set initial values
  let A = a;
  let B: number;

  if (deltaSquared > phiSquared + v) {
    B = Math.log(deltaSquared - phiSquared - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) {
      k++;
    }
    B = a - k * TAU;
  }

  // Step 5.4: Illinois algorithm
  let fA = f(A);
  let fB = f(B);

  while (Math.abs(B - A) > EPSILON) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);

    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }

    B = C;
    fB = fC;
  }

  // Step 5.5: Return new volatility
  return Math.exp(A / 2);
}

/**
 * Update Glicko-2 rating based on game results
 */
export function updateGlicko2Rating(
  currentRating: Glicko2Rating,
  results: Glicko2Result[]
): Glicko2Rating {
  // If no games played, only update rating deviation
  if (results.length === 0) {
    const { rating, rd } = fromGlicko2Scale(currentRating.rating, currentRating.ratingDeviation);
    const newRD = Math.sqrt(rd * rd + currentRating.volatility * currentRating.volatility);
    const { phi } = toGlicko2Scale(1500, newRD);

    return {
      rating: currentRating.rating,
      ratingDeviation: phi,
      volatility: currentRating.volatility,
    };
  }

  // Convert to Glicko-2 scale
  const { mu, phi } = toGlicko2Scale(currentRating.rating, currentRating.ratingDeviation);

  // Step 3: Calculate variance
  const v = calculateVariance(mu, results);

  // Step 4: Calculate delta
  const delta = calculateDelta(mu, results);

  // Step 5: Calculate new volatility
  const newSigma = calculateNewVolatility(phi, currentRating.volatility, delta, v);

  // Step 6: Update rating deviation to new pre-rating period value
  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);

  // Step 7: Update rating and RD
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);

  const glicko2Results = results.map((r) => toGlicko2Scale(r.opponentRating, r.opponentRD));
  let sum = 0;
  for (let i = 0; i < results.length; i++) {
    const { mu: muJ, phi: phiJ } = glicko2Results[i];
    const expectedScore = E(mu, muJ, phiJ);
    sum += g(phiJ) * (results[i].score - expectedScore);
  }

  const newMu = mu + newPhi * newPhi * sum;

  return {
    rating: newMu,
    ratingDeviation: newPhi,
    volatility: newSigma,
  };
}

/**
 * Calculate initial rating for a new item or student
 */
export function createInitialRating(
  rating: number = 1500,
  rd: number = 350,
  volatility: number = 0.06
): Glicko2Rating {
  const { mu, phi } = toGlicko2Scale(rating, rd);
  return {
    rating: mu,
    ratingDeviation: phi,
    volatility,
  };
}

/**
 * Convert Glicko-2 rating to IRT difficulty parameter (b)
 * Maps rating scale to logit scale (-3 to +3)
 */
export function glicko2ToIRTDifficulty(rating: number): number {
  // Convert Glicko-2 mu scale to IRT b parameter
  // Glicko-2 mu typically ranges from -3 to +3
  // IRT difficulty (b) also ranges from -3 to +3
  // Higher rating = easier item (lower difficulty)
  return -rating; // Negative because higher rating = easier
}

/**
 * Convert IRT difficulty to Glicko-2 rating
 */
export function irtDifficultyToGlicko2(difficulty: number): number {
  return -difficulty;
}

/**
 * Calculate win probability between two ratings
 */
export function calculateWinProbability(
  rating1: Glicko2Rating,
  rating2: Glicko2Rating
): number {
  const c = Math.sqrt(
    rating1.ratingDeviation * rating1.ratingDeviation +
      rating2.ratingDeviation * rating2.ratingDeviation
  );
  const gValue = 1 / Math.sqrt(1 + (3 * c * c) / (Math.PI * Math.PI));
  return 1 / (1 + Math.exp(-gValue * (rating1.rating - rating2.rating)));
}
