/**
 * Item Response Theory (IRT) Module
 *
 * Provides adaptive assessment capabilities through:
 * - Glicko-2 rating system for item difficulty
 * - Student ability estimation (theta)
 * - Adaptive item selection
 * - Item calibration
 */

// Glicko-2 Rating System
export {
  toGlicko2Scale,
  fromGlicko2Scale,
  updateGlicko2Rating,
  createInitialRating,
  glicko2ToIRTDifficulty,
  irtDifficultyToGlicko2,
  calculateWinProbability,
  type Glicko2Rating,
  type Glicko2Result,
} from './glicko2';

// Ability Estimation
export {
  probabilityCorrect,
  probabilityCorrect2PL,
  probabilityCorrect3PL,
  estimateAbilityMLE,
  estimateAbilityEAP,
  updateStudentAbility,
  getStudentAbility,
  calculateItemInformation,
  calculateTestInformation,
  type ItemParameters,
  type ResponsePattern,
  type AbilityEstimate,
} from './ability-estimation';

// Adaptive Selection
export {
  selectNextItem,
  shouldStopAssessment,
  getRecommendedDifficultyRange,
  classifyAbilityLevel,
  adaptDifficulty,
  type AdaptiveSelectionOptions,
  type SelectedItem,
} from './adaptive-selection';

// Item Calibration
export {
  calibrateItemCTT,
  calibrateItem2PL,
  calibrateAllItems,
  batchUpdateStudentAbilities,
  type CalibrationResult,
} from './item-calibration';
