# Adaptive Assessment Engine

This document describes the Adaptive Assessment Engine implemented using Item Response Theory (IRT) and Spaced Repetition System (SRS).

## Overview

The Adaptive Assessment Engine provides two major capabilities:

1. **Item Response Theory (IRT)**: Dynamically adjusts question difficulty based on student ability
2. **Spaced Repetition System (SRS)**: Schedules reviews optimally to maximize long-term retention

## Item Response Theory (IRT)

### Concept

IRT models the probability of a correct response as a function of:
- **Student Ability (θ/theta)**: Measured on a logit scale (-3 to +3)
- **Item Difficulty (b)**: Also on a logit scale (-3 to +3)
- **Item Discrimination (a)**: How well an item differentiates between abilities (0 to 2.5)
- **Guessing Parameter (c)**: Probability of guessing correctly (0 to 0.5, for 3PL model)

### Implementation

#### Glicko-2 Rating System

We use the Glicko-2 rating system (an extension of Elo) for question difficulty calibration:

```typescript
import { updateGlicko2Rating, glicko2ToIRTDifficulty } from '@/lib/irt';

// Update difficulty after student response
const newRating = updateGlicko2Rating(currentRating, results);
const irtDifficulty = glicko2ToIRTDifficulty(newRating.rating);
```

**Key Features:**
- Rating: Question difficulty or student ability
- Rating Deviation (RD): Uncertainty in the rating
- Volatility (σ): Expected fluctuation in rating

#### Student Ability Estimation

Student ability (θ) is estimated using Maximum Likelihood Estimation (MLE) or Expected A Posteriori (EAP):

```typescript
import { estimateAbilityMLE, updateStudentAbility } from '@/lib/irt';

// Estimate ability from response pattern
const responses: ResponsePattern[] = [
  {
    itemId: 'assessment-1',
    isCorrect: true,
    parameters: {
      difficulty: 0.5,
      discrimination: 1.2,
      guessing: 0,
      model: 'TWO_PL'
    }
  }
];

const estimate = estimateAbilityMLE(responses);
// Returns: { theta, standardError, confidenceIntervalLower, confidenceIntervalUpper, reliabilityIndex }

// Save to database
await updateStudentAbility(studentId, 'MATH', estimate);
```

#### Adaptive Item Selection

Select the next best item based on student ability:

```typescript
import { selectNextItem } from '@/lib/irt';

const nextItem = await selectNextItem({
  studentId: 'student-123',
  subject: 'MATH',
  currentTheta: 0.5,
  excludeAssessmentIds: ['already-answered-1', 'already-answered-2'],
  bloomsLevelDistribution: {
    REMEMBER: 0.1,
    UNDERSTAND: 0.2,
    APPLY: 0.3,
    ANALYZE: 0.2,
    EVALUATE: 0.1,
    CREATE: 0.1
  }
});
```

**Selection Strategy:**
1. Calculate item information at student's theta
2. Filter by Bloom's level distribution (content balancing)
3. Apply exposure control (randomized selection from top k items)
4. Return item with highest information value

### Database Schema

#### ItemCalibration
```sql
CREATE TABLE ItemCalibration (
  id TEXT PRIMARY KEY,
  assessmentId TEXT UNIQUE,
  problemId TEXT UNIQUE,
  itemType ItemType DEFAULT 'ASSESSMENT',
  irtDifficulty FLOAT,        -- b parameter (-3 to +3)
  irtDiscrimination FLOAT,    -- a parameter (0 to 2.5+)
  irtGuessing FLOAT,          -- c parameter (0 to 0.5)
  calibrationModel IRTModel,  -- ONE_PL, TWO_PL, THREE_PL
  sampleSize INT,
  standardError FLOAT,
  itemInformation FLOAT,
  reliabilityIndex FLOAT,
  lastCalibratedAt TIMESTAMP
);
```

#### StudentAbility
```sql
CREATE TABLE StudentAbility (
  id TEXT PRIMARY KEY,
  studentId TEXT,
  subject Subject,
  currentTheta FLOAT,              -- ability estimate (-3 to +3)
  standardError FLOAT,
  confidenceIntervalLower FLOAT,
  confidenceIntervalUpper FLOAT,
  reliabilityIndex FLOAT,
  assessmentCount INT,
  lastEstimatedAt TIMESTAMP,
  UNIQUE(studentId, subject)
);
```

### API Endpoints

#### GET /api/irt/ability
Get student's current ability estimate.

**Query Parameters:**
- `studentId`: Student ID
- `subject`: MATH | SCIENCE | LANGUAGE_ARTS

**Response:**
```json
{
  "theta": 0.5,
  "standardError": 0.3,
  "confidenceIntervalLower": -0.088,
  "confidenceIntervalUpper": 1.088,
  "reliabilityIndex": 0.85
}
```

#### POST /api/irt/calibrate
Calibrate all items and update student abilities.

**Request Body:**
```json
{
  "subject": "MATH",
  "minResponses": 30
}
```

**Response:**
```json
{
  "message": "Calibration completed successfully",
  "itemsCalibrated": 250,
  "itemsSkipped": 45,
  "studentsUpdated": 150
}
```

#### POST /api/irt/next-item
Get next best item to administer.

**Request Body:**
```json
{
  "studentId": "student-123",
  "subject": "MATH",
  "currentTheta": 0.5,
  "excludeAssessmentIds": ["assessment-1", "assessment-2"],
  "bloomsLevelDistribution": {
    "APPLY": 0.4,
    "ANALYZE": 0.3,
    "EVALUATE": 0.3
  }
}
```

**Response:**
```json
{
  "assessmentId": "assessment-456",
  "difficulty": 0.6,
  "discrimination": 1.2,
  "guessing": 0,
  "bloomsLevel": "APPLY",
  "information": 0.36,
  "expectedProbability": 0.75
}
```

---

## Spaced Repetition System (SRS)

### Concept

SRS optimally schedules reviews based on memory decay to maximize long-term retention. We implement the **FSRS (Free Spaced Repetition Scheduler)** algorithm, a modern improvement over SuperMemo-2.

### FSRS Algorithm

FSRS uses two key parameters:
- **Stability (S)**: How long memory lasts (in days)
- **Difficulty (D)**: Inherent difficulty of the item (0-10)

**Forgetting Curve:**
```
Retrievability(t) = (1 + t/(9*S))^(-1)
```

Where `t` is elapsed days since last review.

### Implementation

#### Scheduling Reviews

```typescript
import { scheduleCard, ReviewRating } from '@/lib/srs';

const card: FSRSCard = {
  stability: 10,
  difficulty: 5,
  elapsedDays: 0,
  scheduledDays: 0,
  reps: 0,
  lapses: 0,
  state: ReviewState.NEW
};

// Student rates difficulty: AGAIN, HARD, GOOD, or EASY
const schedulingInfo = scheduleCard(card, ReviewRating.GOOD);

console.log(schedulingInfo.card.scheduledDays); // e.g., 15 days
console.log(schedulingInfo.card.stability);     // e.g., 15.2 days
```

#### Daily Warmup

Generate a curated set of review items:

```typescript
import { generateDailyWarmup } from '@/lib/srs';

const warmup = await generateDailyWarmup('student-123', 'MATH', 20);

console.log(warmup);
// {
//   newItems: [...],          // 30% new concepts
//   learningItems: [...],     // 30% currently learning
//   reviewItems: [...],       // 40% review items
//   totalDue: 18,
//   estimatedMinutes: 27
// }
```

#### Review Statistics

```typescript
import { getReviewStats } from '@/lib/srs';

const stats = await getReviewStats('student-123', 'MATH');

console.log(stats);
// {
//   totalScheduled: 250,
//   dueToday: 18,
//   dueThisWeek: 45,
//   newCards: 50,
//   learningCards: 30,
//   reviewCards: 150,
//   masteredCards: 20,
//   averageRetention: 0.89  // 89% retention rate
// }
```

### Database Schema

#### ReviewSchedule
```sql
CREATE TABLE ReviewSchedule (
  id TEXT PRIMARY KEY,
  studentId TEXT,
  conceptType ConceptType,      -- STANDARD, TOPIC, PROBLEM
  standardId TEXT,
  topicId TEXT,
  problemId TEXT,
  state ReviewState,            -- NEW, LEARNING, REVIEW, RELEARNING
  stability FLOAT,              -- Memory stability (days)
  difficulty FLOAT,             -- Item difficulty (0-10)
  elapsedDays INT,
  scheduledDays INT,
  dueDate TIMESTAMP,
  lastReviewDate TIMESTAMP,
  lapses INT,                   -- Times forgotten
  reps INT,                     -- Total reviews
  UNIQUE(studentId, conceptType, standardId, topicId, problemId)
);
```

#### ReviewHistory
```sql
CREATE TABLE ReviewHistory (
  id TEXT PRIMARY KEY,
  scheduleId TEXT,
  rating ReviewRating,          -- AGAIN, HARD, GOOD, EASY
  state ReviewState,
  reviewedAt TIMESTAMP,
  elapsedDays INT,
  scheduledDays INT,
  previousStability FLOAT,
  newStability FLOAT,
  previousDifficulty FLOAT,
  newDifficulty FLOAT,
  responseTime INT
);
```

### API Endpoints

#### GET /api/srs/due-items
Get items due for review.

**Query Parameters:**
- `studentId`: Student ID
- `subject`: (optional) MATH | SCIENCE | LANGUAGE_ARTS
- `limit`: (optional) Maximum items to return

**Response:**
```json
{
  "count": 12,
  "items": [
    {
      "scheduleId": "schedule-123",
      "conceptType": "STANDARD",
      "conceptId": "standard-456",
      "conceptName": "Solving linear equations",
      "subject": "MATH",
      "dueDate": "2026-02-09T10:00:00Z",
      "daysUntilDue": 0,
      "stability": 10.5,
      "difficulty": 6.2,
      "retrievability": 0.72,
      "state": "REVIEW",
      "reps": 5,
      "lapses": 1
    }
  ]
}
```

#### GET /api/srs/warmup
Generate Daily Warmup.

**Query Parameters:**
- `studentId`: Student ID
- `subject`: (optional) MATH | SCIENCE | LANGUAGE_ARTS
- `maxItems`: (optional) Maximum items (default: 20)

**Response:**
```json
{
  "newItems": [...],
  "learningItems": [...],
  "reviewItems": [...],
  "totalDue": 18,
  "estimatedMinutes": 27
}
```

#### POST /api/srs/review
Submit a review response.

**Request Body:**
```json
{
  "scheduleId": "schedule-123",
  "rating": 3,           // 1=AGAIN, 2=HARD, 3=GOOD, 4=EASY
  "responseTime": 45000  // milliseconds
}
```

**Response:**
```json
{
  "message": "Review submitted successfully"
}
```

#### GET /api/srs/stats
Get review statistics.

**Query Parameters:**
- `studentId`: Student ID
- `subject`: (optional) MATH | SCIENCE | LANGUAGE_ARTS

**Response:**
```json
{
  "totalScheduled": 250,
  "dueToday": 18,
  "dueThisWeek": 45,
  "newCards": 50,
  "learningCards": 30,
  "reviewCards": 150,
  "masteredCards": 20,
  "averageRetention": 0.89
}
```

---

## Integration with Existing System

### Progress Calculator Enhancement

The `progress-calculator.ts` now uses IRT-enhanced mastery calculation:

```typescript
import { updateProgress } from '@/lib/assessments/progress-calculator';

await updateProgress({
  studentId: 'student-123',
  standardId: 'standard-456',
  tenantId: 'tenant-1',
  assessmentScore: 85,
  bloomsLevel: 'APPLY',
  difficulty: 7,
  assessmentId: 'assessment-789',
  subject: 'MATH'
});
```

**Traditional vs IRT-Enhanced:**
- **Traditional**: Simple exponential moving average with Bloom's and difficulty multipliers
- **IRT-Enhanced**: Compares actual performance to IRT-predicted probability, adjusts mastery based on performance relative to expectation

### Auto-Scheduling from Progress

Automatically schedule standards for SRS review:

```typescript
import { autoScheduleFromProgress } from '@/lib/srs';

// Schedule all standards where student has >= 50% mastery
const scheduled = await autoScheduleFromProgress('student-123', 'MATH');
console.log(`Scheduled ${scheduled} new concepts for review`);
```

---

## Usage Examples

### Complete Adaptive Assessment Flow

```typescript
import { getStudentAbility, selectNextItem, updateStudentAbility, estimateAbilityMLE } from '@/lib/irt';
import { scheduleNewConcept } from '@/lib/srs';

// 1. Get student's current ability
const ability = await getStudentAbility('student-123', 'MATH');
const theta = ability?.theta ?? 0;

// 2. Select next adaptive item
const nextItem = await selectNextItem({
  studentId: 'student-123',
  subject: 'MATH',
  currentTheta: theta,
  excludeAssessmentIds: previouslyAnswered
});

// 3. Present question to student
// ... student answers ...

// 4. Update ability estimate
const allResponses = await getStudentResponses('student-123', 'MATH');
const newEstimate = estimateAbilityMLE(allResponses);
await updateStudentAbility('student-123', 'MATH', newEstimate);

// 5. Schedule concept for spaced repetition
await scheduleNewConcept('student-123', 'STANDARD', standardId, difficulty);
```

### Complete Review Flow

```typescript
import { generateDailyWarmup, submitReview } from '@/lib/srs';
import { ReviewRating } from '@/lib/srs';

// 1. Generate Daily Warmup
const warmup = await generateDailyWarmup('student-123', 'MATH', 20);

// 2. Present items to student
for (const item of warmup.reviewItems) {
  // ... present question ...

  // 3. Student rates difficulty
  const rating = studentFoundItEasy ? ReviewRating.EASY : ReviewRating.GOOD;

  // 4. Submit review
  await submitReview(item.scheduleId, rating, responseTimeMs);
}
```

---

## Configuration

### FSRS Parameters

Default parameters are optimized for general learning. You can customize:

```typescript
import { scheduleCard, type FSRSParameters } from '@/lib/srs';

const customParams: FSRSParameters = {
  w: [/* 17 weight parameters */],
  requestRetention: 0.9,  // Target 90% retention
  maximumInterval: 365    // Max 1 year between reviews
};

const result = scheduleCard(card, rating, new Date(), customParams);
```

### IRT Model Selection

Choose between 1PL (Rasch), 2PL, or 3PL models:

```typescript
// 1PL: All items have same discrimination (a=1)
// 2PL: Items vary in discrimination (recommended)
// 3PL: Accounts for guessing (for multiple choice)

const calibration = await calibrateItem2PL(responses);
```

---

## Performance Considerations

1. **Item Calibration**: Run batch calibration offline (e.g., nightly cron job)
2. **Ability Estimation**: Cache results, update after each assessment
3. **Adaptive Selection**: Pre-compute item information curves
4. **Database Indexes**: Added on frequently queried fields (studentId, dueDate, etc.)

---

## References

### IRT
- Van der Linden, W. J., & Hambleton, R. K. (1997). *Handbook of modern item response theory*
- Glickman, M. E. (2012). "Example of the Glicko-2 system"

### FSRS
- Ye, L., et al. (2024). "A Stochastic Shortest Path Algorithm for Optimizing Spaced Repetition Scheduling"
- [FSRS4Anki GitHub](https://github.com/open-spaced-repetition/fsrs4anki)

---

## Future Enhancements

1. **Machine Learning Optimization**: Train FSRS parameters on actual user data
2. **Multi-dimensional IRT**: Model multiple skills simultaneously
3. **Computerized Adaptive Testing (CAT)**: Full adaptive test implementation
4. **Predictive Analytics**: Forecast student performance and optimal intervention points
5. **A/B Testing**: Compare IRT vs traditional approaches
