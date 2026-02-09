---
title: "Digital Platform"
section: "Technology Integration"
source_path: "10-technology-integration/digital-platform.md"
document_type: "curriculum"
---
# FG2G Digital Platform — RootGuide

## Platform Overview

RootGuide is the integrated digital platform that supports every aspect of FG2G implementation. Built on a Next.js architecture with AI-powered features, RootGuide serves as the technological backbone connecting educators, students, families, and administrators around the shared goal of trauma-informed, garden-based learning.

> *"Technology in FG2G is like the irrigation system in a garden — invisible when working well, essential to sustained growth, and always in service of the living things it supports."*

## Platform Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────┐
│                    ROOTGUIDE PLATFORM                     │
├──────────────┬──────────────┬──────────────┬─────────────┤
│  EDUCATOR    │   STUDENT    │   FAMILY     │   ADMIN     │
│  PORTAL      │   PORTAL     │   PORTAL     │   PORTAL    │
├──────────────┴──────────────┴──────────────┴─────────────┤
│                    CORE SERVICES                          │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │ AI Tutor   │ │ Lesson     │ │ Assessment │           │
│  │ Engine     │ │ Generator  │ │ Engine     │           │
│  └────────────┘ └────────────┘ └────────────┘           │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│  │ Regulation │ │ Garden     │ │ Community  │           │
│  │ Tracker    │ │ Manager    │ │ Hub        │           │
│  └────────────┘ └────────────┘ └────────────┘           │
├──────────────────────────────────────────────────────────┤
│                    DATA LAYER                             │
│  Prisma ORM │ PostgreSQL │ Pinecone (Vector DB)          │
├──────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE                         │
│  Next.js 15 │ React 18 │ Clerk Auth │ Stripe │ Vercel   │
└──────────────────────────────────────────────────────────┘
```

## Portal Descriptions

### Educator Portal

The Educator Portal is the primary interface for FG2G facilitators, providing tools for lesson planning, student monitoring, professional development, and garden management.

**Key Features:**

| Feature | Description | 5Rs Connection |
|---|---|---|
| Lesson Planner | AI-assisted dual-purpose lesson design with standards alignment | Reflect: Structures TRACE-integrated lessons |
| Regulation Dashboard | Real-time class-wide regulation monitoring with trend analysis | Regulate: Visual overview of student regulation patterns |
| Student Profiles | Individual student records with regulation history, portfolio, and growth data | All phases: Comprehensive longitudinal view |
| Garden Manager | Digital garden planning, planting records, and seasonal calendars | Root/Reconnect: Garden integration tools |
| PD Tracker | Professional development progress, credentialing status, video library access | N/A: Educator growth support |
| Resource Library | Searchable database of lesson plans, activities, and materials | All phases: Curriculum resources |
| Communication Hub | Messaging with families, colleagues, and community partners | Reconnect: Community connection |

### Student Portal

The Student Portal provides age-appropriate interfaces for student engagement with FG2G curriculum, adapted by grade band.

**Grade Band Adaptations:**

| Feature | K-2 | 3-5 | 6-8 | 9-12 |
|---|---|---|---|---|
| Interface design | Visual icons, large buttons, audio prompts | Illustrated, guided navigation | Standard web interface | Full-featured dashboard |
| Regulation check-in | Emoji-based feelings selector | Visual scale with descriptors | Numbered scale with reflection | Self-directed scale with journaling |
| Garden journal | Drawing and photo-based | Guided prompts with drawing/writing | Structured templates | Open-format with data integration |
| AI Tutor interaction | Voice-based, story-format | Guided conversation with scaffolds | Socratic dialogue | Independent research partnership |
| Portfolio | Teacher-curated | Student-selected with guidance | Student-managed | Student-directed with capstone |

### Family Portal

The Family Portal keeps families connected to their child's FG2G experience and provides resources for extending learning at home.

**Key Features:**

| Feature | Description |
|---|---|
| Student progress | View regulation trends, academic growth, and garden activities |
| Garden at home | Guides for creating home garden connections aligned to classroom learning |
| 5Rs at home | Family-friendly explanations of each phase with home practice suggestions |
| Communication | Direct messaging with educators; event notifications; volunteer sign-up |
| Resources | Multilingual family guides, video library selections, community resources |

### Administrator Portal

The Administrator Portal provides school and district leaders with implementation oversight and program evaluation tools.

**Key Features:**

| Feature | Description |
|---|---|
| Implementation dashboard | Fidelity metrics, usage data, and adoption rates across classrooms |
| Outcome reports | Aggregated student outcomes: regulation trends, academic metrics, SEL measures, discipline data |
| Educator development | PD completion rates, credentialing progress, coaching utilization |
| Resource allocation | Budget tracking, garden supply management, staffing dashboards |
| Program evaluation | Longitudinal data analysis for continuous improvement and reporting |

## AI Tutor Engine — RootGuide AI

### Architecture

The RootGuide AI Tutor uses a dual-model architecture to provide responsive, trauma-informed academic support:

```
STUDENT INPUT
     │
     ▼
┌─────────────────┐
│ DYSREGULATION   │──── Detected ────→ Redirect to Root Phase
│ DETECTION       │                    (co-regulation prompts,
│ (Sentiment +    │                    sensory suggestions,
│  behavioral     │                    breathing exercises)
│  analysis)      │
└────────┬────────┘
         │ Not detected
         ▼
┌─────────────────┐
│ REGULATION      │──── Determine ────→ Adapt response complexity,
│ LEVEL           │     level           pace, and scaffolding
│ ASSESSMENT      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ACADEMIC        │──── Generate ──────→ TRACE-aligned response
│ RESPONSE        │     response        with appropriate reasoning
│ ENGINE          │                     moves and garden connections
└─────────────────┘
```

### Dysregulation Detection

The AI Tutor continuously monitors for signs of student distress through:

| Signal Type | Indicators | Response |
|---|---|---|
| Language patterns | Increased negative language, frustration expressions, disengagement phrases | Gentle redirect to regulation check-in |
| Interaction patterns | Rapid clicking, long pauses, repeated errors, session abandonment attempts | Offer break, simplify task, suggest garden activity |
| Self-reported state | Student uses regulation check-in feature to indicate low regulation | Immediate shift to co-regulation mode |
| Escalation patterns | Progressive deterioration across multiple indicators | Alert educator dashboard; provide calming prompts |

### TRACE Protocol Integration

The AI Tutor facilitates learning using the TRACE protocol, adapting to student regulation level:

| TRACE Step | AI Tutor Behavior | Example Prompt |
|---|---|---|
| Think | Poses open-ended questions; provides wait time | "Before we start, what do you already know about photosynthesis?" |
| Reason | Guides evidence-based reasoning without giving answers | "That's interesting — what evidence from our garden observations supports that?" |
| Articulate | Encourages students to explain their thinking | "Can you explain that in your own words?" |
| Check | Prompts verification and self-assessment | "How confident are you in that answer? How could you check?" |
| Extend | Connects learning to new contexts | "Where else in the garden might we see this same principle?" |

## Regulation Tracker

### Data Collection and Visualization

The Regulation Tracker provides continuous monitoring of student regulation patterns:

**Data Sources:**
- Student self-reported regulation levels (daily check-ins)
- Educator-observed regulation assessments
- AI Tutor interaction data (engagement patterns, emotional indicators)
- Academic performance data (error rates, completion rates)

**Visualization Options:**

| View | Description | Use Case |
|---|---|---|
| Individual timeline | Single student regulation over days/weeks/months | Student conferences, family meetings |
| Class heatmap | All students' regulation levels in real-time grid | In-session monitoring and response |
| Trend analysis | Statistical trends with correlation to academic and SEL outcomes | Program evaluation, intervention planning |
| Phase alignment | Regulation levels mapped against 5Rs phase progression | Curriculum pacing decisions |
| Comparison reports | Before/after comparisons across time periods | Progress monitoring, efficacy reporting |

## Data Privacy and Security

### Student Data Protection

| Protection Layer | Implementation |
|---|---|
| Authentication | Clerk-based authentication with role-based access control |
| Data encryption | AES-256 encryption at rest; TLS 1.3 in transit |
| Access controls | Educators see only their students; administrators see aggregated data |
| Data minimization | Collect only data necessary for educational purpose |
| Retention policy | Student data retained for duration of enrollment + 3 years; then anonymized |
| Parental consent | Opt-in consent required for all student data collection |
| FERPA compliance | All data handling follows Family Educational Rights and Privacy Act requirements |
| COPPA compliance | Additional protections for students under 13 |

### Ethical AI Principles

The RootGuide AI Tutor operates under these principles:
1. **Transparency** — Students and educators can see how the AI makes recommendations
2. **Human oversight** — AI never replaces educator judgment; always defers to human decision-making
3. **Bias monitoring** — Regular audits for demographic bias in AI responses and recommendations
4. **Trauma sensitivity** — AI never probes for trauma details; always redirects to human support
5. **Student agency** — Students can always opt out of AI interaction without penalty

## Implementation Requirements

### Technical Requirements

| Component | Minimum Specification |
|---|---|
| Internet connectivity | 10 Mbps per classroom (25 Mbps recommended) |
| Devices | 1 device per 3 students (1:1 recommended for grades 3+) |
| Browser | Chrome, Firefox, Safari, or Edge (current versions) |
| Educator devices | Laptop or tablet with minimum 4GB RAM |
| Display | Classroom projection or large display for group activities |

### Onboarding Process

1. **District setup** (Week 1) — Account creation, data import, role assignment
2. **Educator training** (Week 2) — Platform orientation included in PD Module 5
3. **Student onboarding** (Week 3) — Age-appropriate platform introduction
4. **Family access** (Week 4) — Family portal activation with orientation materials
5. **Full implementation** (Week 5+) — All features active with ongoing support
