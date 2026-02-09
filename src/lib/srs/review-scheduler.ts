/**
 * Review Scheduler
 *
 * Manages spaced repetition scheduling for concepts, topics, and problems.
 * Integrates FSRS algorithm with database persistence.
 */

import { prisma } from "@/lib/db";
import type { Subject, ConceptType, ReviewState as PrismaReviewState } from "@prisma/client";
import {
  scheduleCard,
  getNextReviewDate,
  isDue,
  getDaysUntilDue,
  getCurrentRetrievability,
  initCard,
  type FSRSCard,
  type FSRSParameters,
  type ReviewRating,
  DEFAULT_PARAMETERS,
  ReviewState as FSRSReviewState,
} from "./fsrs";

export interface ReviewItem {
  scheduleId: string;
  conceptType: ConceptType;
  conceptId: string;
  conceptName: string;
  subject: Subject;
  dueDate: Date;
  daysUntilDue: number;
  stability: number;
  difficulty: number;
  retrievability: number;
  state: PrismaReviewState;
  reps: number;
  lapses: number;
}

export interface DailyWarmup {
  newItems: ReviewItem[];
  learningItems: ReviewItem[];
  reviewItems: ReviewItem[];
  totalDue: number;
  estimatedMinutes: number;
}

/**
 * Convert Prisma ReviewState to FSRS ReviewState
 */
function toFSRSState(state: PrismaReviewState): FSRSReviewState {
  switch (state) {
    case "NEW":
      return FSRSReviewState.NEW;
    case "LEARNING":
      return FSRSReviewState.LEARNING;
    case "REVIEW":
      return FSRSReviewState.REVIEW;
    case "RELEARNING":
      return FSRSReviewState.RELEARNING;
    default:
      return FSRSReviewState.NEW;
  }
}

/**
 * Convert FSRS ReviewState to Prisma ReviewState
 */
function toPrismaState(state: FSRSReviewState): PrismaReviewState {
  switch (state) {
    case FSRSReviewState.NEW:
      return "NEW";
    case FSRSReviewState.LEARNING:
      return "LEARNING";
    case FSRSReviewState.REVIEW:
      return "REVIEW";
    case FSRSReviewState.RELEARNING:
      return "RELEARNING";
    default:
      return "NEW";
  }
}

/**
 * Schedule a new concept for review
 */
export async function scheduleNewConcept(
  studentId: string,
  conceptType: ConceptType,
  conceptId: string,
  initialDifficulty: number = 5
): Promise<void> {
  const card = initCard();
  const now = new Date();

  // Determine which field to set based on concept type
  const data: any = {
    studentId,
    conceptType,
    state: toPrismaState(card.state),
    stability: card.stability,
    difficulty: initialDifficulty,
    elapsedDays: 0,
    scheduledDays: 0,
    dueDate: now,
    lastReviewDate: null,
    lapses: 0,
    reps: 0,
  };

  if (conceptType === "STANDARD") {
    data.standardId = conceptId;
  } else if (conceptType === "TOPIC") {
    data.topicId = conceptId;
  } else if (conceptType === "PROBLEM") {
    data.problemId = conceptId;
  }

  await prisma.reviewSchedule.create({
    data,
  });
}

/**
 * Submit a review response and update schedule
 */
export async function submitReview(
  scheduleId: string,
  rating: ReviewRating,
  responseTime?: number,
  params: FSRSParameters = DEFAULT_PARAMETERS
): Promise<void> {
  const schedule = await prisma.reviewSchedule.findUnique({
    where: { id: scheduleId },
  });

  if (!schedule) {
    throw new Error("Schedule not found");
  }

  // Convert to FSRS card
  const card: FSRSCard = {
    stability: schedule.stability,
    difficulty: schedule.difficulty,
    elapsedDays: schedule.elapsedDays,
    scheduledDays: schedule.scheduledDays,
    reps: schedule.reps,
    lapses: schedule.lapses,
    state: toFSRSState(schedule.state),
    lastReview: schedule.lastReviewDate || undefined,
  };

  // Calculate new schedule
  const now = new Date();
  const schedulingInfo = scheduleCard(card, rating, now, params);
  const newCard = schedulingInfo.card;
  const nextReviewDate = getNextReviewDate(newCard, now);

  // Update schedule in database
  await prisma.reviewSchedule.update({
    where: { id: scheduleId },
    data: {
      state: toPrismaState(newCard.state),
      stability: newCard.stability,
      difficulty: newCard.difficulty,
      elapsedDays: newCard.elapsedDays,
      scheduledDays: newCard.scheduledDays,
      dueDate: nextReviewDate,
      lastReviewDate: now,
      lapses: newCard.lapses,
      reps: newCard.reps,
    },
  });

  // Create review history entry
  await prisma.reviewHistory.create({
    data: {
      scheduleId,
      rating,
      state: schedule.state,
      reviewedAt: now,
      elapsedDays: schedulingInfo.reviewLog.elapsedDays,
      scheduledDays: schedulingInfo.reviewLog.scheduledDays,
      previousStability: card.stability,
      newStability: newCard.stability,
      previousDifficulty: card.difficulty,
      newDifficulty: newCard.difficulty,
      responseTime,
    },
  });
}

/**
 * Get all items due for review for a student
 */
export async function getDueItems(
  studentId: string,
  subject?: Subject,
  limit?: number
): Promise<ReviewItem[]> {
  const now = new Date();

  const schedules = await prisma.reviewSchedule.findMany({
    where: {
      studentId,
      dueDate: {
        lte: now,
      },
      ...(subject && {
        OR: [
          { standard: { subject } },
          { topic: { subject } },
          { problem: { topic: { subject } } },
        ],
      }),
    },
    include: {
      standard: true,
      topic: true,
      problem: {
        include: {
          topic: true,
        },
      },
    },
    orderBy: {
      dueDate: "asc",
    },
    take: limit,
  });

  return schedules.map((schedule) => {
    const card: FSRSCard = {
      stability: schedule.stability,
      difficulty: schedule.difficulty,
      elapsedDays: schedule.elapsedDays,
      scheduledDays: schedule.scheduledDays,
      reps: schedule.reps,
      lapses: schedule.lapses,
      state: toFSRSState(schedule.state),
      lastReview: schedule.lastReviewDate || undefined,
    };

    let conceptName = "";
    let conceptSubject: Subject = "MATH";

    if (schedule.standard) {
      conceptName = schedule.standard.description;
      conceptSubject = schedule.standard.subject;
    } else if (schedule.topic) {
      conceptName = schedule.topic.name;
      conceptSubject = schedule.topic.subject;
    } else if (schedule.problem) {
      conceptName = schedule.problem.stem.substring(0, 100) + "...";
      conceptSubject = schedule.problem.topic.subject;
    }

    return {
      scheduleId: schedule.id,
      conceptType: schedule.conceptType,
      conceptId: (schedule.standardId || schedule.topicId || schedule.problemId)!,
      conceptName,
      subject: conceptSubject,
      dueDate: schedule.dueDate,
      daysUntilDue: getDaysUntilDue(card, now),
      stability: schedule.stability,
      difficulty: schedule.difficulty,
      retrievability: getCurrentRetrievability(card, now),
      state: schedule.state,
      reps: schedule.reps,
      lapses: schedule.lapses,
    };
  });
}

/**
 * Generate Daily Warmup - a curated set of review items
 */
export async function generateDailyWarmup(
  studentId: string,
  subject?: Subject,
  maxItems: number = 20
): Promise<DailyWarmup> {
  const now = new Date();

  // Get all due items
  const allDueItems = await getDueItems(studentId, subject);

  // Separate by state
  const newItems = allDueItems.filter((item) => item.state === "NEW");
  const learningItems = allDueItems.filter(
    (item) => item.state === "LEARNING" || item.state === "RELEARNING"
  );
  const reviewItems = allDueItems.filter((item) => item.state === "REVIEW");

  // Prioritize learning items, then reviews, then new
  // Typical distribution: 30% new, 30% learning, 40% review
  const maxNew = Math.floor(maxItems * 0.3);
  const maxLearning = Math.floor(maxItems * 0.3);
  const maxReview = maxItems - maxNew - maxLearning;

  const selectedNew = newItems.slice(0, maxNew);
  const selectedLearning = learningItems.slice(0, maxLearning);
  const selectedReview = reviewItems.slice(0, maxReview);

  // Fill remaining slots if any category is under-represented
  const remaining = maxItems - selectedNew.length - selectedLearning.length - selectedReview.length;
  if (remaining > 0) {
    const additionalReviews = reviewItems.slice(maxReview, maxReview + remaining);
    selectedReview.push(...additionalReviews);
  }

  const totalDue = selectedNew.length + selectedLearning.length + selectedReview.length;

  // Estimate time: ~1-2 minutes per item
  const estimatedMinutes = Math.ceil(totalDue * 1.5);

  return {
    newItems: selectedNew,
    learningItems: selectedLearning,
    reviewItems: selectedReview,
    totalDue,
    estimatedMinutes,
  };
}

/**
 * Get review statistics for a student
 */
export async function getReviewStats(
  studentId: string,
  subject?: Subject
): Promise<{
  totalScheduled: number;
  dueToday: number;
  dueThisWeek: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  masteredCards: number;
  averageRetention: number;
}> {
  const now = new Date();
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const whereClause: any = {
    studentId,
  };

  if (subject) {
    whereClause.OR = [
      { standard: { subject } },
      { topic: { subject } },
      { problem: { topic: { subject } } },
    ];
  }

  const [totalScheduled, dueToday, dueThisWeek, stateStats] = await Promise.all([
    prisma.reviewSchedule.count({ where: whereClause }),
    prisma.reviewSchedule.count({
      where: {
        ...whereClause,
        dueDate: { lte: now },
      },
    }),
    prisma.reviewSchedule.count({
      where: {
        ...whereClause,
        dueDate: { lte: weekFromNow },
      },
    }),
    prisma.reviewSchedule.groupBy({
      by: ["state"],
      where: whereClause,
      _count: true,
    }),
  ]);

  const statsByState = Object.fromEntries(stateStats.map((s) => [s.state, s._count]));

  // Calculate average retention
  const schedules = await prisma.reviewSchedule.findMany({
    where: {
      ...whereClause,
      lastReviewDate: { not: null },
    },
    select: {
      stability: true,
      lastReviewDate: true,
    },
  });

  let totalRetention = 0;
  for (const schedule of schedules) {
    const card: FSRSCard = {
      stability: schedule.stability,
      difficulty: 5,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: FSRSReviewState.REVIEW,
      lastReview: schedule.lastReviewDate!,
    };
    totalRetention += getCurrentRetrievability(card, now);
  }

  const averageRetention = schedules.length > 0 ? totalRetention / schedules.length : 1;

  // Consider cards "mastered" if they have stability > 100 days and few lapses
  const masteredCards = await prisma.reviewSchedule.count({
    where: {
      ...whereClause,
      stability: { gte: 100 },
      lapses: { lte: 1 },
      state: "REVIEW",
    },
  });

  return {
    totalScheduled,
    dueToday,
    dueThisWeek,
    newCards: statsByState["NEW"] || 0,
    learningCards: (statsByState["LEARNING"] || 0) + (statsByState["RELEARNING"] || 0),
    reviewCards: statsByState["REVIEW"] || 0,
    masteredCards,
    averageRetention,
  };
}

/**
 * Auto-schedule standards based on student progress
 * Creates review schedules for standards the student is learning
 */
export async function autoScheduleFromProgress(
  studentId: string,
  subject: Subject
): Promise<number> {
  // Get standards where student has progress but no review schedule
  const progressRecords = await prisma.progress.findMany({
    where: {
      studentId,
      standard: {
        subject,
      },
      masteryLevel: {
        gte: 50, // Only schedule if student has at least 50% mastery
      },
    },
    include: {
      standard: true,
    },
  });

  let scheduled = 0;

  for (const progress of progressRecords) {
    // Check if already scheduled
    const existing = await prisma.reviewSchedule.findFirst({
      where: {
        studentId,
        conceptType: "STANDARD",
        standardId: progress.standardId,
      },
    });

    if (!existing) {
      // Calculate initial difficulty based on mastery level
      // Lower mastery = higher difficulty
      const difficulty = 10 - (progress.masteryLevel / 10);

      await scheduleNewConcept(studentId, "STANDARD", progress.standardId, difficulty);
      scheduled++;
    }
  }

  return scheduled;
}
