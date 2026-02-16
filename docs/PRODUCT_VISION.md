# Product Vision

## Mission

RootWork Learning Hub exists to deliver equitable, AI-powered education for exceptional learners. Developed by Community Exceptional Children's Services (CECS), the platform combines trauma-informed pedagogy with adaptive AI tutoring so that every K-12 student -- regardless of disability, background, or school district -- can access personalized learning that honors both their emotional and cognitive needs.

## Target Users

| Role | Description |
|------|-------------|
| **Student** | K-12 learners, including those with IEPs and 504 plans, who interact with the AI tutor and complete assessments. |
| **Parent / Guardian** | Manage consent, view progress dashboards, and receive notifications about their child's learning. |
| **Educator** | Classroom teachers and special education staff who review AI-generated content, manage classes, and monitor student progress. |
| **School Admin** | School-level administrators who oversee educator rosters and school settings. |
| **District Admin** | Tenant-level administrators responsible for compliance, billing, and multi-school configuration. |
| **Platform Admin** | CECS engineering and operations staff who manage the platform infrastructure, global curriculum, and cross-tenant operations. |

## Key Capabilities

- **AI Tutoring** -- Conversational tutoring sessions powered by Anthropic Claude, with real-time streaming and context-aware scaffolding.
- **5R Framework Integration** -- Every tutoring session follows the Root-Regulate-Reflect-Restore-Reconnect sequence, embedding social-emotional learning into academic instruction.
- **IEP Accommodation Engine** -- Active IEP accommodations are loaded into the AI prompt context so that tutoring responses adapt to each student's documented needs.
- **Adaptive Assessments** -- Diagnostic, formative, and summative assessments powered by Item Response Theory (IRT) to continuously calibrate difficulty.
- **Human-in-the-Loop Review** -- AI suggestions for IEP recommendations, progress notes, and low-confidence responses are routed to educators for approval before reaching student records.
- **Compliance by Design** -- FERPA, COPPA, and IDEA compliance controls are built into the data model, consent gating, audit logging, and data retention workflows.
- **Multi-Tenant Architecture** -- Full tenant isolation allows the platform to serve multiple school districts from a single deployment.

## The 5R Framework

The 5R Framework, created by Dr. Shawn A. Hearn, is the pedagogical backbone of RootWork. Inspired by the natural growth cycle of plants, it provides a structured sequence for every learning interaction:

1. **Root** -- Establish safety and readiness. "Am I safe and ready to learn?"
2. **Regulate** -- Co-regulation and emotional stabilization. "Can I return to my window of tolerance?"
3. **Reflect** -- Active learning and metacognition. "What am I thinking, and why?"
4. **Restore** -- Error recovery and growth mindset. "What can I learn from this mistake?"
5. **Reconnect** -- Application and real-world integration. "How does this connect to my world?"

The AI tutor tracks the student's current phase and adjusts its prompting strategy accordingly. Phase transitions are governed by a state machine that evaluates regulation levels and sentiment analysis to ensure the student is emotionally prepared before advancing to cognitively demanding phases.

## Theoretical Foundations

The 5R Framework draws on established research in developmental psychology and education:

- **Polyvagal Theory (Porges, 2011)** -- Learning requires a felt sense of safety. The Root and Regulate phases address the autonomic nervous system's need for environmental and relational safety before higher-order cognitive processes can engage.
- **Window of Tolerance (Siegel, 1999)** -- Students operate within a zone of optimal arousal. The Regulate phase provides co-regulation strategies to return students to their window before academic demands are introduced.
- **Growth Mindset (Dweck, 2006)** -- The Restore phase treats errors as neurological events where new synaptic connections form, reducing the shame response that accompanies mistakes in traditional settings.
- **Metacognition and Self-Regulated Learning (Zimmerman, 2002)** -- The Reflect phase develops metacognitive skills through the TRACE protocol (Think, Reason, Articulate, Check, Extend).
- **Experiential Learning (Kolb, 1984)** -- The Reconnect phase ensures learning transfers beyond the immediate context into real-world applications.

## Differentiation from General LMS Platforms

Most learning management systems treat content delivery and assessment as their primary concern. RootWork differs in three fundamental ways:

1. **Emotion-first pedagogy** -- The 5R state machine ensures that academic content is never delivered until the student's emotional readiness has been validated, making the platform suitable for trauma-impacted and neurodiverse learners.
2. **Special education compliance** -- IEP accommodations, FERPA/COPPA consent gating, and IDEA progress monitoring are first-class features, not afterthoughts bolted onto a general-purpose system.
3. **AI safety for minors** -- Pre- and post-generation guardrails, mandatory educator review for sensitive content, and a strict no-PII-in-prompts policy make the AI pipeline appropriate for use with children, including those under 13.

## Guiding Principles

- **Equity over efficiency** -- The platform prioritizes equitable access for students with disabilities over maximizing throughput or engagement metrics.
- **Transparency** -- Students and families are informed that AI powers the tutoring experience. The AI tutor identifies itself as "RootGuide" and never misrepresents itself as a human.
- **Educator authority** -- AI augments but never replaces professional educator judgment. Every AI-generated recommendation requires human approval before affecting student records.
- **Privacy by default** -- Student data is collected only for educational purposes, never sold, and never used to train AI models.
