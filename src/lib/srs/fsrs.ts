/**
 * Free Spaced Repetition Scheduler (FSRS) Algorithm
 *
 * A modern spaced repetition algorithm that improves upon SM-2.
 * FSRS uses a more sophisticated memory model based on the three-component model of memory.
 *
 * Key improvements over SM-2:
 * - Separate stability and difficulty parameters
 * - More accurate forgetting curve
 * - Better handling of lapses
 * - Data-driven optimization
 *
 * References:
 * - https://github.com/open-spaced-repetition/fsrs4anki
 * - Ye, L., et al. (2024). "A Stochastic Shortest Path Algorithm for Optimizing Spaced Repetition Scheduling"
 */

export interface FSRSParameters {
  // Weights for the FSRS algorithm (17 parameters)
  w: number[];
  // Request retention (target probability of recall, typically 0.9)
  requestRetention: number;
  // Maximum interval in days
  maximumInterval: number;
}

export interface FSRSCard {
  stability: number; // Memory stability in days
  difficulty: number; // Item difficulty (0-10, higher = harder)
  elapsedDays: number; // Days since last review
  scheduledDays: number; // Days scheduled for review
  reps: number; // Total repetitions
  lapses: number; // Number of times forgotten
  state: ReviewState;
  lastReview?: Date;
}

export enum ReviewState {
  NEW = "NEW",
  LEARNING = "LEARNING",
  REVIEW = "REVIEW",
  RELEARNING = "RELEARNING",
}

export enum ReviewRating {
  AGAIN = 1, // Completely forgot
  HARD = 2, // Remembered with difficulty
  GOOD = 3, // Remembered correctly
  EASY = 4, // Remembered easily
}

export interface SchedulingInfo {
  card: FSRSCard;
  reviewLog: {
    rating: ReviewRating;
    state: ReviewState;
    scheduledDays: number;
    elapsedDays: number;
  };
}

/**
 * Default FSRS parameters (v4.5)
 * These can be optimized with actual user data
 */
export const DEFAULT_PARAMETERS: FSRSParameters = {
  w: [
    0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616, 0.1544, 1.0824,
    1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034, 0.6567,
  ],
  requestRetention: 0.9,
  maximumInterval: 36500, // 100 years
};

/**
 * Initialize a new card
 */
export function initCard(): FSRSCard {
  return {
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: ReviewState.NEW,
  };
}

/**
 * Calculate initial stability after first review
 */
function initStability(rating: ReviewRating, params: FSRSParameters): number {
  return Math.max(params.w[rating - 1], 0.1);
}

/**
 * Calculate initial difficulty after first review
 */
function initDifficulty(rating: ReviewRating, params: FSRSParameters): number {
  const difficulty = params.w[4] - (rating - 3) * params.w[5];
  return constrainDifficulty(difficulty);
}

/**
 * Constrain difficulty to [1, 10] range
 */
function constrainDifficulty(difficulty: number): number {
  return Math.min(Math.max(difficulty, 1), 10);
}

/**
 * Calculate next difficulty
 */
function nextDifficulty(
  difficulty: number,
  rating: ReviewRating,
  params: FSRSParameters
): number {
  const deltaD = rating - 3;
  const nextD = difficulty - params.w[6] * deltaD;
  const meanReversion = params.w[7] * (initDifficulty(ReviewRating.GOOD, params) - nextD);
  return constrainDifficulty(nextD + meanReversion);
}

/**
 * Calculate forgetting curve retention
 */
function retention(elapsedDays: number, stability: number): number {
  return Math.pow(1 + (elapsedDays / (9 * stability)), -1);
}

/**
 * Calculate next stability for recalled cards
 */
function nextRecallStability(
  stability: number,
  difficulty: number,
  retrievability: number,
  rating: ReviewRating,
  params: FSRSParameters
): number {
  const hardPenalty = rating === ReviewRating.HARD ? params.w[15] : 1;
  const easyBonus = rating === ReviewRating.EASY ? params.w[16] : 1;

  return (
    stability *
    (1 +
      Math.exp(params.w[8]) *
        (11 - difficulty) *
        Math.pow(stability, -params.w[9]) *
        (Math.exp((1 - retrievability) * params.w[10]) - 1) *
        hardPenalty *
        easyBonus)
  );
}

/**
 * Calculate next stability for forgotten cards
 */
function nextForgetStability(
  stability: number,
  difficulty: number,
  retrievability: number,
  params: FSRSParameters
): number {
  return (
    params.w[11] *
    Math.pow(difficulty, -params.w[12]) *
    (Math.pow(stability + 1, params.w[13]) - 1) *
    Math.exp((1 - retrievability) * params.w[14])
  );
}

/**
 * Calculate interval based on stability and target retention
 */
function calculateInterval(stability: number, requestRetention: number): number {
  return Math.round(stability * (Math.pow(requestRetention, 1 / 9) - 1) * 9);
}

/**
 * Constrain interval to maximum
 */
function constrainInterval(interval: number, maximumInterval: number): number {
  return Math.min(Math.max(Math.round(interval), 1), maximumInterval);
}

/**
 * Schedule a card review based on rating
 */
export function scheduleCard(
  card: FSRSCard,
  rating: ReviewRating,
  now: Date = new Date(),
  params: FSRSParameters = DEFAULT_PARAMETERS
): SchedulingInfo {
  const elapsedDays = card.lastReview
    ? Math.max(0, Math.floor((now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const newCard = { ...card };
  newCard.elapsedDays = elapsedDays;
  newCard.lastReview = now;
  newCard.reps += 1;

  switch (card.state) {
    case ReviewState.NEW: {
      newCard.difficulty = initDifficulty(rating, params);

      if (rating === ReviewRating.AGAIN) {
        newCard.state = ReviewState.LEARNING;
        newCard.stability = initStability(rating, params);
        newCard.scheduledDays = 0;
      } else if (rating === ReviewRating.HARD) {
        newCard.state = ReviewState.LEARNING;
        newCard.stability = initStability(rating, params);
        newCard.scheduledDays = 0;
      } else if (rating === ReviewRating.GOOD) {
        newCard.state = ReviewState.LEARNING;
        newCard.stability = initStability(rating, params);
        newCard.scheduledDays = constrainInterval(
          calculateInterval(newCard.stability, params.requestRetention),
          params.maximumInterval
        );
      } else {
        // EASY
        newCard.state = ReviewState.REVIEW;
        newCard.stability = initStability(rating, params);
        newCard.scheduledDays = constrainInterval(
          calculateInterval(newCard.stability, params.requestRetention),
          params.maximumInterval
        );
      }
      break;
    }

    case ReviewState.LEARNING:
    case ReviewState.RELEARNING: {
      const retrievability =
        card.stability > 0 ? retention(elapsedDays, card.stability) : 0;

      if (rating === ReviewRating.AGAIN) {
        newCard.state = ReviewState.RELEARNING;
        newCard.stability = nextForgetStability(
          card.stability,
          card.difficulty,
          retrievability,
          params
        );
        newCard.difficulty = nextDifficulty(card.difficulty, rating, params);
        newCard.scheduledDays = 0;
        newCard.lapses += 1;
      } else {
        newCard.state = ReviewState.REVIEW;
        newCard.stability = nextRecallStability(
          card.stability,
          card.difficulty,
          retrievability,
          rating,
          params
        );
        newCard.difficulty = nextDifficulty(card.difficulty, rating, params);
        newCard.scheduledDays = constrainInterval(
          calculateInterval(newCard.stability, params.requestRetention),
          params.maximumInterval
        );
      }
      break;
    }

    case ReviewState.REVIEW: {
      const retrievability = retention(elapsedDays, card.stability);

      if (rating === ReviewRating.AGAIN) {
        newCard.state = ReviewState.RELEARNING;
        newCard.stability = nextForgetStability(
          card.stability,
          card.difficulty,
          retrievability,
          params
        );
        newCard.difficulty = nextDifficulty(card.difficulty, rating, params);
        newCard.scheduledDays = 0;
        newCard.lapses += 1;
      } else {
        newCard.state = ReviewState.REVIEW;
        newCard.stability = nextRecallStability(
          card.stability,
          card.difficulty,
          retrievability,
          rating,
          params
        );
        newCard.difficulty = nextDifficulty(card.difficulty, rating, params);
        newCard.scheduledDays = constrainInterval(
          calculateInterval(newCard.stability, params.requestRetention),
          params.maximumInterval
        );
      }
      break;
    }
  }

  return {
    card: newCard,
    reviewLog: {
      rating,
      state: card.state,
      scheduledDays: card.scheduledDays,
      elapsedDays,
    },
  };
}

/**
 * Get all possible scheduling outcomes for a card
 */
export function getSchedulingCards(
  card: FSRSCard,
  now: Date = new Date(),
  params: FSRSParameters = DEFAULT_PARAMETERS
): Record<ReviewRating, SchedulingInfo> {
  return {
    [ReviewRating.AGAIN]: scheduleCard(card, ReviewRating.AGAIN, now, params),
    [ReviewRating.HARD]: scheduleCard(card, ReviewRating.HARD, now, params),
    [ReviewRating.GOOD]: scheduleCard(card, ReviewRating.GOOD, now, params),
    [ReviewRating.EASY]: scheduleCard(card, ReviewRating.EASY, now, params),
  };
}

/**
 * Calculate next review date
 */
export function getNextReviewDate(card: FSRSCard, now: Date = new Date()): Date {
  const nextDate = new Date(now);
  nextDate.setDate(nextDate.getDate() + card.scheduledDays);
  return nextDate;
}

/**
 * Check if card is due for review
 */
export function isDue(card: FSRSCard, now: Date = new Date()): boolean {
  if (!card.lastReview) {
    return true;
  }

  const nextReview = getNextReviewDate(card, card.lastReview);
  return now >= nextReview;
}

/**
 * Get days until next review (negative if overdue)
 */
export function getDaysUntilDue(card: FSRSCard, now: Date = new Date()): number {
  if (!card.lastReview) {
    return 0;
  }

  const nextReview = getNextReviewDate(card, card.lastReview);
  const daysUntil = Math.floor(
    (nextReview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysUntil;
}

/**
 * Calculate current retrievability (probability of recall)
 */
export function getCurrentRetrievability(card: FSRSCard, now: Date = new Date()): number {
  if (!card.lastReview || card.stability === 0) {
    return 1;
  }

  const elapsedDays = Math.floor(
    (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24)
  );
  return retention(elapsedDays, card.stability);
}
