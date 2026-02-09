import { z } from 'zod';

// ---------------------------------------------------------------------------
// Violation types
// ---------------------------------------------------------------------------

export const ViolationSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type ViolationSeverity = z.infer<typeof ViolationSeveritySchema>;

export const ViolationCategorySchema = z.enum([
  'content_safety',
  'hallucination',
  'five_rs_compliance',
  'iep_safety',
  'pii_detected',
  'inappropriate_content',
  'unauthorized_recommendation',
]);
export type ViolationCategory = z.infer<typeof ViolationCategorySchema>;

export const ViolationSchema = z.object({
  category: ViolationCategorySchema,
  severity: ViolationSeveritySchema,
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});
export type Violation = z.infer<typeof ViolationSchema>;

// ---------------------------------------------------------------------------
// Guardrail result types
// ---------------------------------------------------------------------------

export const GuardrailResultSchema = z.object({
  passed: z.boolean(),
  violations: z.array(ViolationSchema),
  sanitizedContent: z.string(),
  confidenceScore: z.number().min(0).max(1),
  processingTimeMs: z.number(),
  metadata: z.object({
    checksRun: z.array(z.string()),
    hallucinationScore: z.number().min(0).max(1),
    fiveRsAlignmentScore: z.number().min(0).max(1),
    contentSafetyScore: z.number().min(0).max(1),
  }),
});
export type GuardrailResult = z.infer<typeof GuardrailResultSchema>;

// ---------------------------------------------------------------------------
// Guardrail context — information available when running checks
// ---------------------------------------------------------------------------

export const GuardrailContextSchema = z.object({
  sessionPhase: z.string(),
  subject: z.string(),
  gradeLevel: z.number().int().min(0).max(12),
  accommodations: z.array(z.string()),
  ragContext: z.string(),
  sessionHistory: z.string(),
  studentId: z.string(),
});
export type GuardrailContext = z.infer<typeof GuardrailContextSchema>;

// ---------------------------------------------------------------------------
// Pre-generation result (validates user input before sending to model)
// ---------------------------------------------------------------------------

export const PreGenerationResultSchema = z.object({
  allowed: z.boolean(),
  sanitizedInput: z.string(),
  violations: z.array(ViolationSchema),
});
export type PreGenerationResult = z.infer<typeof PreGenerationResultSchema>;

// ---------------------------------------------------------------------------
// Post-generation result (validates model output before returning to user)
// ---------------------------------------------------------------------------

export const PostGenerationResultSchema = z.object({
  passed: z.boolean(),
  sanitizedOutput: z.string(),
  violations: z.array(ViolationSchema),
  confidenceScore: z.number().min(0).max(1),
  hallucinationScore: z.number().min(0).max(1),
  fiveRsAlignmentScore: z.number().min(0).max(1),
});
export type PostGenerationResult = z.infer<typeof PostGenerationResultSchema>;

// ---------------------------------------------------------------------------
// Content safety types
// ---------------------------------------------------------------------------

export const ContentSafetyResultSchema = z.object({
  safe: z.boolean(),
  violations: z.array(ViolationSchema),
  safetyScore: z.number().min(0).max(1),
  sanitizedContent: z.string(),
});
export type ContentSafetyResult = z.infer<typeof ContentSafetyResultSchema>;

// ---------------------------------------------------------------------------
// Hallucination detection types
// ---------------------------------------------------------------------------

export const GroundedClaimSchema = z.object({
  claim: z.string(),
  sourceExcerpt: z.string(),
});
export type GroundedClaim = z.infer<typeof GroundedClaimSchema>;

export const UngroundedClaimSchema = z.object({
  claim: z.string(),
  reason: z.string(),
});
export type UngroundedClaim = z.infer<typeof UngroundedClaimSchema>;

export const HallucinationCheckSchema = z.object({
  confidenceScore: z.number().min(0).max(1),
  groundedClaims: z.array(GroundedClaimSchema),
  ungroundedClaims: z.array(UngroundedClaimSchema),
  fabricatedReferences: z.array(z.string()),
  violations: z.array(ViolationSchema),
});
export type HallucinationCheck = z.infer<typeof HallucinationCheckSchema>;

// ---------------------------------------------------------------------------
// 5Rs compliance types
// ---------------------------------------------------------------------------

export const FiveRsComplianceResultSchema = z.object({
  compliant: z.boolean(),
  phaseAlignmentScore: z.number().min(0).max(1),
  violations: z.array(ViolationSchema),
  traceAdherence: z.object({
    asksForReasoning: z.boolean(),
    scaffoldsInsteadOfTelling: z.boolean(),
    usesTraceSteps: z.boolean(),
  }),
});
export type FiveRsComplianceResult = z.infer<typeof FiveRsComplianceResultSchema>;

// ---------------------------------------------------------------------------
// IEP safety types
// ---------------------------------------------------------------------------

export const IepSafetyResultSchema = z.object({
  compliant: z.boolean(),
  violations: z.array(ViolationSchema),
  accommodationAlignment: z.record(z.boolean()),
});
export type IepSafetyResult = z.infer<typeof IepSafetyResultSchema>;
