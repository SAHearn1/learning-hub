# Staff Training Guide: AI in RootWork Learning Hub

**Audience:** Educators, clinical partners, and administrative staff
**Version:** 1.0 | February 2026

---

## 1. Overview of AI Capabilities

The RootWork Learning Hub uses an AI tutor called **RootGuide**, powered by Anthropic Claude, to support students in Mathematics, Science, and Language Arts. RootGuide operates within the 5R Framework and is designed to scaffold thinking rather than provide direct answers.

**What the AI does:**
- Guides students through learning sessions using the 5R phases (Root, Regulate, Reflect, Restore, Reconnect)
- Applies the TRACE protocol (Think, Reason, Articulate, Check, Extend) to build metacognitive skills
- Adapts responses based on each student's IEP accommodations (simplified language, chunked content, extended time, etc.)
- Detects dysregulation signals and offers co-regulation supports
- Generates assessment feedback, progress notes, and accommodation suggestions for educator review

**What the AI does not do:**
- Replace educator judgment or decision-making
- Diagnose students or provide medical/therapeutic advice
- Modify IEP accommodations or recommend changes to IEP plans
- Disclose a student's IEP status or accommodation details to the student
- Deliver content to students without passing safety checks

## 2. HITL Review Responsibilities

All sensitive AI-generated content requires your review before reaching students. This is the Human-in-the-Loop (HITL) system.

### Accessing the Review Queue

Navigate to the **Educator Dashboard** and select the **AI Review Queue**. Items are categorized by type:

| Suggestion Type | Description |
|---|---|
| Tutoring Response | AI-generated instructional content for a student session |
| IEP Recommendation | AI-suggested changes to accommodation strategies |
| Assessment Feedback | AI-generated feedback on student assessment performance |
| Accommodation Suggestion | AI-proposed accommodation adjustments |
| Progress Note | AI-drafted progress documentation |

### Review Actions

For each item in the queue, you must select one of three actions:

- **Approve** -- The content is appropriate and can be delivered as-is.
- **Approve with Edits** -- The content is mostly appropriate but needs modification. You must provide the edited version.
- **Reject** -- The content is inappropriate or inaccurate. You must provide a rejection note explaining why.

### Review Guidelines

- Read the full AI-generated content carefully, not just the summary.
- Check that the content matches the student's current 5R phase.
- Verify that IEP accommodations are being respected (e.g., chunked content is actually short, simplified language uses grade-appropriate vocabulary).
- Look for any language that could be perceived as shaming, blaming, or diagnostic.
- Confirm that the AI is scaffolding rather than giving direct answers.
- Review items promptly; unreviewed items expire after their timeout period.

## 3. Understanding 5R Framework Integration with AI

The AI tutor follows the same 5R methodology you use in the classroom. Each session phase has distinct AI behaviors:

| Phase | AI Behavior | What to Monitor |
|---|---|---|
| **Root** | Grounding check-ins, readiness assessment | AI should ask how the student is feeling, not jump to academics |
| **Regulate** | Co-regulation offers, breathing exercises, break suggestions | AI should never force a student to continue while dysregulated |
| **Reflect** | TRACE protocol, scaffolding questions, reasoning-before-confirmation | AI must ask for student reasoning before confirming answers |
| **Restore** | Error reframing as learning opportunities, misconception exploration | AI should never say "wrong"; it should explore why the error happened |
| **Reconnect** | Real-world application, session reflection, next-session intentions | AI should connect learning to real-world contexts |

**Key rule:** The AI must always ask a student to explain their reasoning before confirming whether an answer is correct. If you see the AI confirming correctness without first probing reasoning, reject the content.

## 4. IEP Accommodation Awareness

The AI adapts its behavior based on each student's documented accommodations. Here is what each accommodation controls and what you should monitor:

| Accommodation | AI Adaptation | Monitor For |
|---|---|---|
| SIMPLIFIED_MODE | Simpler vocabulary, shorter sentences | Average word complexity staying within threshold |
| CHUNKED_CONTENT | One idea per message, max 500 characters, max 5 sentences | Responses that are too long or contain multiple concepts |
| EXTENDED_TIME | No rushing language, no time pressure | Phrases like "hurry up" or "time is running out" |
| REDUCED_STIMULI | Shorter responses, minimal complexity | Responses exceeding 400 characters |
| FREQUENT_BREAKS | Regular break offers, regulation check-ins | Sessions without break offers |
| MODIFIED_DIFFICULTY | Gradual scaffolding, no inappropriate difficulty jumps | AI suggesting the student skip ahead or that content is "too easy" |
| VISUAL_SUPPORTS | Text-described diagrams and visual representations | Purely text-based explanations where visuals would help |

**Critical rule:** The AI will never disclose to a student that they have an IEP or describe their accommodations. Accommodations are applied silently. If you see the AI referencing a student's IEP directly, this is a safety violation that should be reported immediately.

## 5. Common AI Limitations

Be aware of these known limitations when reviewing AI outputs:

- **Hallucination risk**: The AI may cite curriculum modules, standards, or assessment scores that do not exist. The hallucination detector catches many of these, but not all. Verify any specific references.
- **Phase drift**: The AI may occasionally use language appropriate for a different 5R phase than the one currently active. The compliance checker flags this, but subtle drift may pass through.
- **Accommodation edge cases**: For students with multiple accommodations, the AI may satisfy one constraint while violating another (e.g., providing visual supports that exceed the reduced-stimuli length limit).
- **Context window limits**: In long sessions, the AI may lose track of earlier conversation context. If responses seem disconnected from the session flow, this is likely a context limitation.
- **Pattern-based detection limits**: Safety guardrails use pattern matching, which can produce false positives (flagging safe content) or miss novel harmful phrasing. Your judgment as an educator is the final safeguard.

## 6. Escalation Procedures

### Automatic Escalations (You Will Be Notified)

The system automatically alerts you when a student's message contains:
- Self-harm ideation ("want to die", "kill myself", "end it all")
- Abuse or neglect disclosure ("someone hurt me", "someone touched me")
- Intent to harm others ("going to hurt someone")
- Self-harm disclosure ("I cut myself", "I burn myself")

When you receive an escalation alert, follow your organization's mandated reporting procedures immediately. The AI will provide a supportive response to the student, but human intervention is required.

### Manual Escalations (You Identify an Issue)

If you identify problematic AI content during HITL review or through student/parent reports:

1. **Reject the content** in the review queue with detailed notes.
2. **Document the issue** including the student ID, session context, and the specific content of concern.
3. **Report to your supervisor** following the incident response procedures in `docs/incident-response-playbook.md`.
4. **Do not attempt to fix AI behavior directly.** Content safety patterns and guardrail rules are maintained by the engineering team.

## 7. Student Data Privacy (FERPA/COPPA)

As a staff member, you share responsibility for protecting student data:

- **FERPA**: Student education records, including AI tutoring session data, are protected. Do not share session transcripts, AI-generated progress notes, or assessment data with unauthorized parties.
- **COPPA**: Students under 13 require verified parental consent before using AI-powered features. The platform enforces this at the API level, but you should verify that consent is current for your students.
- **IDEA**: IEP accommodation data used by the AI is protected educational information. Never discuss a student's AI-adapted accommodations with other students or unauthorized staff.

**Practical rules:**
- Do not screenshot or copy AI session transcripts outside the platform.
- Do not discuss specific student AI interactions in public or shared spaces.
- Report any suspected data breach to your administrator immediately.
- Parents/guardians may request access to their child's AI session data or request deletion through the data rights interface.

## 8. Quick Reference

| Action | Where to Find It |
|---|---|
| Review pending AI suggestions | Educator Dashboard > AI Review Queue |
| View review statistics (approval rate, daily counts) | Educator Dashboard > Review Stats |
| View completed reviews (approved/rejected history) | Educator Dashboard > Completed Reviews |
| Check a student's active accommodations | Student Profile > IEP Accommodations |
| Report an AI safety concern | Educator Dashboard > Report Issue (or contact supervisor) |
| View compliance documentation | Educator Dashboard > Compliance |
| Access the AI governance framework | `docs/AI_GOVERNANCE.md` |
| Access the incident response playbook | `docs/incident-response-playbook.md` |

---

**Questions?** Contact your site administrator or the CECS technology team. This guide is updated when new AI features are introduced or policies change.
