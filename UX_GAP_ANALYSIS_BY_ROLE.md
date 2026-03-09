# UX Gap Analysis by Role

## Scope and method
This assessment reviews the implemented user experience across role-based portals in the Learning Hub codebase, focusing on:
- Role entry points and onboarding.
- Navigation completeness vs available pages.
- Core task coverage and workflow continuity.
- UX consistency, feedback, and trust/compliance touchpoints.

Roles evaluated:
1. Student
2. Educator
3. Parent/Guardian
4. School Admin
5. District Admin
6. Platform Admin (Super Admin)

---

## 1) Student UX

### Current experience
- Students are explicitly supported in onboarding and dashboard routing.
- Student navigation is broad and coherent (`Explore`, `Learn`, `Curriculum`, `Regulate`, `Progress`, `Community`, `Settings`) with grade-aware personalization for Financial Literacy (grade 9+).
- Student dashboard includes practical workflow blocks: quick actions, class join, assignments, and recent session continuity.

### Strengths
- Strong first-run and return-user path (dashboard + quick actions).
- Personalized and context-aware navigation via grade-level gating.
- Good action affordances and immediate task paths (join class, continue learning, submit assignments).

### Gaps
- Student experience appears more mature than other roles, creating cross-role parity imbalance.
- No clear in-flow guidance for transitions between `Explore` recommendations and scheduled/classroom obligations.
- Potential discoverability gap between main student workspace (`/learn`, `/explore`) and class-centric workspace (`/student/assignments`) for new users.

---

## 2) Educator UX

### Current experience
- Educator role has dedicated dashboard, nav model, and key pages (`Students`, `Classes`, `Reports`, `Compliance`).
- The portal supports roster, planning, compliance tracking, and human-in-the-loop review concepts.

### Strengths
- Educator workflows are directionally complete at IA level (student ops + class ops + reporting + compliance).
- Clear copy and task framing by page sections.
- Compliance and review surfaces reinforce safety and instructional accountability.

### Gaps
- Several educator surfaces rely on local/mock client store patterns, reducing trust in production-readiness and data freshness.
- Workflow continuity between review/compliance/reporting appears fragmented (separate tools, limited visible cross-linking).
- Limited evidence of guided “next best action” for teachers under time pressure (e.g., overdue compliance + pending reviews + at-risk students in one queue).

---

## 3) Parent/Guardian UX

### Current experience
- Parent has dashboard routing and role-specific nav (`Children`, `Grades`, `Consent`, `Settings`).
- Consent and settings experiences are present and operationally focused.

### Strengths
- Clear value framing: monitoring learner progress + managing consent and preferences.
- COPPA-consent workflow is explicit and understandable from a parent perspective.

### Gaps
- Navigation information scent issue: `Children` points to `/parent/settings` (same destination as `Settings`), which can confuse mental models.
- Parent dashboard is currently a portal shell and lacks high-signal summary cards (e.g., recent activity, upcoming deadlines, risk alerts).
- Consent page allows unauthenticated render state messaging instead of strict parent-role page gating at page entry, creating inconsistent role UX patterns.

---

## 4) School Admin UX

### Current experience
- School admin dashboard exists with cards for classes, educators, students, compliance, and billing.
- School-admin navigation defines these destinations.

### Strengths
- Correct top-level information architecture intent for school operations.
- Core domains are represented.

### Gaps (high severity)
- Most school-admin nav destinations are missing pages (`/school-admin/classes`, `/school-admin/educators`, `/school-admin/students`, `/school-admin/compliance`, `/school-admin/billing`).
- Dashboard cards are descriptive but not actionable (no linked drill-down pathways).
- End-to-end admin task completion is blocked for primary school admin jobs.

---

## 5) District Admin UX

### Current experience
- District admins can access `/admin/dashboard` and receive district-oriented content blocks.
- District-admin nav model lists `Schools`, `Educators`, and `Compliance`.

### Strengths
- Role framing is clear at dashboard level.
- Shared admin infrastructure exists.

### Gaps (high severity)
- Declared district-admin destinations are missing (`/admin/schools`, `/admin/educators`, `/admin/compliance`).
- The dashboard behaves as a static overview rather than operational cockpit.
- Weak continuity from district metrics to interventions/actions.

---

## 6) Platform Admin (Super Admin) UX

### Current experience
- Platform admins route to super admin dashboard component and have ingest control access.
- Admin nav (`Super Admin Dashboard`, `Ingestion Control`) aligns with existing pages.

### Strengths
- Better route-to-feature integrity than school/district admin.
- Presence of platform-ops functionality (tenant interventions, invoices, ingest ops).

### Gaps
- Split UX language between “district admin” and “super admin” within `/admin/dashboard` may create role ambiguity.
- Shared admin URL namespace with role-conditional rendering can make orientation harder without stronger role badges/breadcrumb context.

---

## Cross-role findings

### 1) Navigation-to-page integrity gap (critical)
Role navigation definitions include multiple dead-end destinations for school and district admins.

### 2) Role experience maturity imbalance (critical)
Student and portions of educator UX are significantly more developed than parent/admin journeys.

### 3) Inconsistent role gating patterns (medium)
Some role pages enforce role at page boundary, while others rely on downstream API checks or unauthenticated state messaging.

### 4) Limited workflow orchestration (medium)
Most portals present domain pages, but fewer cross-domain workflows (e.g., identify risk -> notify parent -> assign intervention -> monitor effect).

### 5) Portal shell vs actionable dashboard mismatch (medium)
Several dashboards are informational and not deeply operational, especially for parent/school/district roles.

---

## Prioritized gap summary

### P0 (immediate)
1. Build or route-safe stub all missing school-admin and district-admin destinations.
2. Add explicit links/CTAs from school/district dashboard cards to concrete workflows.
3. Resolve parent nav duplication (`Children` vs `Settings`) with distinct IA and pages.

### P1 (near-term)
1. Standardize role-gating at page level for all protected role routes.
2. Add “at-a-glance” parent dashboard metrics and alerts.
3. Connect educator compliance/review/reporting into a single actionable queue.

### P2 (next)
1. Harmonize admin role labeling and orientation cues across shared `/admin` space.
2. Improve cross-role handoff UX (educator -> parent, admin -> educator, student -> parent visibility).
3. Add guided empty states and onboarding nudges for all non-student roles.

---

## Recommended KPI framework for UX remediation
Track impact of fixes with role-specific metrics:
- Task completion rate by role (e.g., school admin “create class”, parent “grant consent”).
- Time-to-first-value by role after onboarding.
- Dead-click / 404 rate by role portal.
- Cross-role workflow completion rate (e.g., concern identified -> intervention completed).
- Weekly active role distribution and retention parity across roles.

