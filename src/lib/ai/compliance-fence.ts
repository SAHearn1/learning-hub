/**
 * AI Co-Pilot Compliance Fence
 *
 * Constrains AI-generated content to narrative fields only.
 * The fence reads a compliance snapshot and prevents AI from:
 *   - Altering procedural state (case status, transitions)
 *   - Overriding ERROR or CRITICAL rule results
 *   - Modifying immutable audit records
 *   - Writing to fields governed by compliance rules
 *
 * This module is the gatekeeper between AI suggestion output
 * and the compliance-governed data layer.
 */

import type { ComplianceSnapshot } from '@/lib/compliance-dashboard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Fields that AI is allowed to write to. */
export type AiWritableField =
  | 'incidentDescription'
  | 'servicesDescription'
  | 'referralReason'
  | 'rationale'
  | 'meetingNotes'
  | 'notes'
  | 'narrative'
  | 'reportContent';

/** A request from the AI co-pilot to write data. */
export type AiFenceRequest = {
  /** The resource type being modified. */
  resource: string;
  /** The field being written. */
  field: string;
  /** The proposed value. */
  value: string;
  /** The ID of the record (if updating an existing record). */
  resourceId?: string;
};

/** Result of a fence check. */
export type AiFenceResult = {
  allowed: boolean;
  reason: string;
};

// ---------------------------------------------------------------------------
// Allowed Fields Registry
// ---------------------------------------------------------------------------

const WRITABLE_FIELDS: Set<AiWritableField> = new Set([
  'incidentDescription',
  'servicesDescription',
  'referralReason',
  'rationale',
  'meetingNotes',
  'notes',
  'narrative',
  'reportContent',
]);

/** Resources whose records are immutable (append-only). */
const IMMUTABLE_RESOURCES: Set<string> = new Set([
  'EvalStateTransition',
  'EvalAssessmentRecord',
  'EvalConsentRecord',
  'EligibilityDecision',
  'GoalProgressEntry',
  'ProgressReport',
  'ManifestDetermination',
  'AuditLog',
]);

/** Fields that represent procedural state — AI must never modify. */
const PROCEDURAL_STATE_FIELDS: Set<string> = new Set([
  'currentState',
  'status',
  'deliveryStatus',
  'outcome',
  'decision',
  'reviewStatus',
]);

// ---------------------------------------------------------------------------
// Core Fence Logic
// ---------------------------------------------------------------------------

/**
 * Check whether the AI co-pilot is allowed to perform the proposed write.
 * This is a pure, synchronous function — no DB access.
 */
export function checkAiFence(
  request: AiFenceRequest,
  snapshot: ComplianceSnapshot,
): AiFenceResult {
  // 1. Block writes to immutable resources (updating existing records)
  if (IMMUTABLE_RESOURCES.has(request.resource) && request.resourceId) {
    return {
      allowed: false,
      reason: `Resource ${request.resource} is immutable. AI cannot modify existing records.`,
    };
  }

  // 2. Block writes to procedural state fields
  if (PROCEDURAL_STATE_FIELDS.has(request.field)) {
    return {
      allowed: false,
      reason: `Field "${request.field}" governs procedural state. AI cannot alter compliance state.`,
    };
  }

  // 3. Only allow writing to narrative/descriptive fields
  if (!WRITABLE_FIELDS.has(request.field as AiWritableField)) {
    return {
      allowed: false,
      reason: `Field "${request.field}" is not in the AI-writable field list. AI is restricted to narrative fields.`,
    };
  }

  // 4. Block if district is in CRITICAL compliance state
  if (snapshot.riskLevel === 'CRITICAL') {
    return {
      allowed: false,
      reason: `District compliance is CRITICAL (risk score ${snapshot.riskScore}/100). AI writes suspended until compliance issues are resolved.`,
    };
  }

  return {
    allowed: true,
    reason: 'Write permitted — field is AI-writable and compliance is acceptable.',
  };
}

/**
 * Batch-check multiple AI write requests. Returns results for each.
 */
export function checkAiFenceBatch(
  requests: AiFenceRequest[],
  snapshot: ComplianceSnapshot,
): AiFenceResult[] {
  return requests.map((req) => checkAiFence(req, snapshot));
}

/**
 * Returns the list of fields the AI co-pilot is allowed to write to.
 */
export function getAiWritableFields(): AiWritableField[] {
  return [...WRITABLE_FIELDS];
}

/**
 * Returns whether a resource is immutable (AI cannot update existing records).
 */
export function isImmutableResource(resource: string): boolean {
  return IMMUTABLE_RESOURCES.has(resource);
}
