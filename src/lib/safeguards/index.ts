// IDEA Procedural Safeguards — Barrel Export

export { ALL_PSN_RULES, PSN_001, PSN_002, PSN_003, PSN_004, PSN_005, PSN_006 } from './psn-rules';
export type { PsnRule } from './psn-rules';

export { evaluateProceduralSafeguards } from './psn-evaluator';

export { getCurrentSchoolYear } from './school-year';

export { generateSafeguardsNoticeDocument } from './notice-generator';
export type { NoticeGeneratorParams, GeneratedNotice } from './notice-generator';

export {
  upsertProceduralEvent,
  isTriggerSatisfied,
  generateNotice,
  markNoticeDelivered,
  acknowledgeNotice,
  getNoticesForStudent,
  getEventsForStudent,
} from './procedural-safeguards.service';

export { intercept, mapActionToTrigger } from './psn-interceptor';
