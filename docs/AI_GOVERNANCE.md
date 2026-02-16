# AI Governance Framework

This document defines the safety, oversight, and ethical controls governing AI behavior in the RootWork Learning Hub. The platform uses Anthropic Claude to power an AI tutoring system for K-12 students, including minors and students with disabilities, which demands a high standard of care.

## Model Selection

The platform uses Anthropic Claude as its sole AI model provider. Claude was selected for its strong safety alignment, instruction-following reliability, and Anthropic's responsible scaling commitments. The Anthropic SDK is used for all API calls (`src/lib/ai/client.ts`). No student data is used for model training; the platform operates under Anthropic's API data usage policy, which prohibits training on API inputs and outputs.

## Guardrails Architecture

All AI interactions pass through the `GuardrailsEngine` (`src/lib/ai/guardrails/index.ts`), which runs two validation stages:

### Pre-Generation Guardrails (User Input)

Before the student's message is sent to Claude, the engine runs:

- **Content safety** (`content-safety.ts`) -- Detects harmful content categories (violence, sexual content, self-harm, substance use, political bias, diagnostic language) using pattern matching calibrated for educational contexts. False-positive rates are monitored and tuned.
- **PII detection** -- Scans for and redacts personally identifiable information (names, addresses, phone numbers, email addresses) before prompt assembly. No student PII reaches the model.
- **Escalation trigger detection** -- Identifies messages indicating a student may be in crisis (self-harm language, abuse indicators). These messages are allowed through so the AI can provide a supportive response, but the system immediately flags the session for educator notification.
- **Prompt injection defense** -- Input is sanitized to prevent adversarial prompts that attempt to override system instructions or extract system prompt content.

If pre-generation checks produce a critical or high-severity violation, the message is blocked and the student receives a safe fallback response.

### Post-Generation Guardrails (AI Output)

Before the AI response is delivered to the student, the engine runs:

- **Content safety** -- The same content safety checks applied to the AI output, catching any harmful content the model may have generated.
- **Hallucination detection** (`hallucination-detector.ts`) -- Compares claims in the AI output against the RAG context and session history. Ungrounded claims and fabricated references are flagged. A confidence score below threshold triggers HITL review.
- **5R compliance** (`five-rs-compliance.ts`) -- Verifies that the response aligns with the current session phase. Checks whether the AI scaffolds instead of telling, asks for reasoning, and follows the TRACE protocol (Think, Reason, Articulate, Check, Extend). A phase alignment score is computed.
- **IEP safety** (`iep-safety.ts`) -- Validates that the response does not contradict or undermine the student's active IEP accommodations. Checks accommodation alignment per documented need.

If post-generation checks fail (any critical violation, or more than one high-severity violation), the response is withheld and routed to the HITL queue.

## Human-in-the-Loop (HITL) Review

The HITL system (`src/lib/ai/hitl/suggestion-service.ts`) provides educator oversight for AI-generated content that requires human judgment:

### What Gets Queued

- AI responses with low confidence scores.
- IEP recommendations and accommodation suggestions.
- Assessment feedback and progress notes.
- Any response flagged by post-generation guardrails.

### Review Workflow

1. A suggestion is created in `PENDING_REVIEW` status with the original AI content, confidence score, guardrail flags, and session context snapshot.
2. Educators see pending reviews in their review queue, prioritized by severity and recency.
3. The educator can approve, approve with edits, or reject the suggestion. Rejections require notes explaining the reason.
4. Approved content is committed to the student record. Rejected content is discarded but retained for audit.
5. Stale reviews are automatically expired after their configured TTL.

### Review Statistics

The system tracks pending counts, daily approval and rejection rates, average review time, and overall approval rate per tenant. These metrics inform workload balancing and guardrail tuning.

## Data Handling

- **No PII in prompts** -- Student PII is stripped before prompt assembly. The AI receives anonymized session context, subject matter, grade level, accommodation types, and RAG excerpts.
- **No data retention by the model provider** -- Under Anthropic's API terms, inputs and outputs are not retained for training.
- **Prompt content** -- System prompts include the 5R phase instructions, subject scaffolding guidance, accommodation directives, and safety boundaries. System prompts are versioned in `src/lib/ai/prompts/`.

## Bias Monitoring

- Guardrail trigger rates are tracked per demographic segment where sufficient data exists, to identify disproportionate blocking.
- Content safety thresholds are reviewed quarterly to reduce false positives that may disproportionately affect certain student populations.
- The 5R compliance checker is designed to be culturally responsive, avoiding assumptions about emotional expression norms.

## Teacher Override Authority

Educators retain ultimate authority over all AI-generated content that affects student records:

- No AI suggestion becomes part of a student's official record without educator approval via the HITL workflow.
- Educators can override AI-driven phase transitions in the 5R state machine.
- IEP accommodation recommendations generated by the AI are treated as drafts until an educator confirms them.
- Educators can disable AI tutoring for individual students at any time.

## Incident Response

If an AI safety incident occurs (harmful content delivered to a student, PII leak, guardrail bypass):

1. The session is flagged and the student sees a safe fallback message.
2. The incident is logged in the immutable audit chain.
3. The security and compliance teams are notified per the incident response playbook (`docs/incident-response-playbook.md`).
4. A root cause analysis is conducted, guardrails are updated, and regression tests are added.

Escalation tiers:

- **Tier 1** -- Guardrail violation caught and blocked automatically. Logged for review, no student impact.
- **Tier 2** -- Escalation trigger in student input (self-harm, abuse disclosure). AI provides supportive response; educator notified immediately.
- **Tier 3** -- AI content passes guardrails but is rejected by educator during HITL review. Patterns added to guardrail rules.
- **Tier 4** -- AI content reaches a student and is later identified as harmful. Immediate removal, root cause analysis, parent notification if warranted.

## Model Update Policy

Before any AI model version change is deployed to production:

1. The full guardrail test suite (content safety, hallucination detection, 5R compliance, IEP safety) must pass against the new model version.
2. A representative sample of tutoring scenarios must be evaluated for 5R framework compliance and accommodation adherence.
3. New model versions are deployed to staging first. Educator review of outputs in staging is required before production promotion.
4. The previous model version must remain available for immediate rollback.
5. Model version changes are recorded with the date, rationale, testing results, and approving authority.

## Transparency and Consent

- Students and parents are informed that the platform uses AI to support tutoring. The AI identifies itself as "RootGuide" and does not misrepresent itself as a human.
- Parental consent is required before any student engages with AI-powered features. Consent is verified at the API level before every learning interaction.
- Parents may withdraw consent at any time through the consent management interface, which immediately disables AI features for the student.
- Data access and deletion requests are handled via the data rights API (`/api/compliance/data-rights`) in compliance with FERPA, COPPA, and IDEA.

---

**Review schedule:** This governance framework is reviewed quarterly and updated when new AI capabilities are introduced, regulations change, or incidents require policy revision.
