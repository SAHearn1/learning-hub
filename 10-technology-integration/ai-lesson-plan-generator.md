---
title: "AI Lesson Plan Generator"
section: "Technology Integration"
source_path: "10-technology-integration/ai-lesson-plan-generator.md"
document_type: "curriculum"
---
# AI Lesson Plan Generator

## Overview

The FG2G AI Lesson Plan Generator is an educator-facing tool within the RootGuide platform that assists in creating dual-purpose, 5Rs-aligned lesson plans. The generator does not replace educator creativity and contextual knowledge — it amplifies them by handling structural alignment, standards mapping, and differentiation scaffolding while the educator provides the vision, garden context, and student knowledge that only a human facilitator can offer.

> *"The AI Lesson Plan Generator is like a garden planning almanac — it knows the growing zones, the planting calendars, and the companion planting charts, but only the gardener knows the soil in this particular garden, the microclimates of this specific site, and the needs of these unique plants."*

## How the Generator Works

### Input-Output Flow

```
EDUCATOR INPUTS                    AI PROCESSING                    OUTPUTS
───────────────                    ─────────────                    ───────
Grade band (K-2/3-5/6-8/9-12)  →  ┌──────────────┐             → Dual-purpose
Academic standard(s)             →  │ Curriculum    │             → lesson plan
5Rs phase focus                  →  │ Knowledge     │             → with:
Garden context/season            →  │ Base          │             →
Student regulation patterns      →  │              │             → • Learning objectives
Time available                   →  │ + Standards   │             → • 5Rs phase structure
Specific student needs           →  │ Crosswalk     │             → • Garden activities
                                    │              │             → • Academic activities
                                    │ + Garden      │             → • TRACE prompts
                                    │ Activity      │             → • Regulation adaptations
                                    │ Database      │             → • Materials list
                                    │              │             → • Assessment criteria
                                    │ + Regulation  │             → • Educator language models
                                    │ Adaptation    │             →
                                    │ Framework     │             →
                                    └──────────────┘
```

### Generation Process

1. **Context gathering** — Educator provides inputs through a guided interface
2. **Standards alignment** — AI maps selected standards to appropriate 5Rs activities
3. **Garden integration** — AI selects garden activities appropriate to season, grade band, and available space
4. **Dual-purpose design** — Each activity is designed to simultaneously serve academic and SEL goals
5. **TRACE embedding** — AI integrates TRACE protocol prompts at appropriate points
6. **Regulation differentiation** — AI generates adaptations for all five regulation tiers
7. **Educator review** — Generated plan presented for educator modification and approval
8. **Refinement** — Educator edits, adjusts, and personalizes the plan

## Lesson Plan Output Format

### Standard Template

Every generated lesson plan follows this structure:

```
┌─────────────────────────────────────────────┐
│ LESSON HEADER                               │
│ Title, Grade Band, Duration, Standards,     │
│ 5Rs Phase, Garden Context, Season           │
├─────────────────────────────────────────────┤
│ LEARNING OBJECTIVES                         │
│ Academic objective + SEL objective           │
│ (always paired)                             │
├─────────────────────────────────────────────┤
│ ROOT OPENING (10-15 min)                    │
│ Grounding activity, regulation check-in     │
├─────────────────────────────────────────────┤
│ CORE ACTIVITY (25-40 min)                   │
│ Garden-based learning activity with         │
│ embedded TRACE protocol and reasoning moves │
├─────────────────────────────────────────────┤
│ RESTORE/REFLECT BRIDGE (10-15 min)         │
│ Error analysis or reflective discussion     │
├─────────────────────────────────────────────┤
│ RECONNECT CLOSING (5-10 min)               │
│ Connection to community, purpose, or next   │
│ session preview                             │
├─────────────────────────────────────────────┤
│ REGULATION ADAPTATIONS                      │
│ Tier-by-tier modifications for the lesson   │
├─────────────────────────────────────────────┤
│ MATERIALS & PREPARATION                     │
│ Garden materials, classroom materials,      │
│ advance preparation needed                  │
├─────────────────────────────────────────────┤
│ ASSESSMENT                                  │
│ Formative assessment criteria for both      │
│ academic and SEL objectives                 │
├─────────────────────────────────────────────┤
│ EDUCATOR LANGUAGE MODELS                    │
│ Suggested phrases for key moments           │
└─────────────────────────────────────────────┘
```

## Example Generated Lesson Plans

### Example 1: Grade 3-5, Math + Regulate Phase

**Input:**
- Grade Band: 3-5
- Standard: CCSS.Math.3.MD.7 (Area measurement)
- 5Rs Phase: Regulate
- Garden Context: Raised bed planning
- Season: Early spring
- Time: 60 minutes

**Generated Plan (Summary):**

| Section | Content |
|---|---|
| Title | "Designing Our Spring Garden Beds: Area and Regulation" |
| Academic Objective | Students calculate area of rectangular garden beds using multiplication |
| SEL Objective | Students practice self-regulation during collaborative problem-solving |
| Root Opening | Garden walk to observe dormant beds; sensory grounding with soil |
| Core Activity | Teams design raised beds with specific area requirements; measure, calculate, and negotiate designs while monitoring their own regulation |
| TRACE Integration | "Think: What do you need to know to find the area? Reason: How can multiplication help?" |
| Restore Bridge | Teams compare designs and identify calculation errors without judgment |
| Reconnect Closing | "When we plant these beds, who will benefit from the food we grow?" |
| Regulation Adaptations | Tier 0-19: Pair with regulated partner; use manipulatives only. Tier 80-100: Design irregular-shaped beds; calculate composite areas |

### Example 2: Grade 6-8, Science + Reflect Phase

**Input:**
- Grade Band: 6-8
- Standard: NGSS MS-LS2-1 (Ecosystem interactions)
- 5Rs Phase: Reflect
- Garden Context: Companion planting observations
- Season: Late spring
- Time: 90 minutes (double period)

**Generated Plan (Summary):**

| Section | Content |
|---|---|
| Title | "Ecosystem Detectives: Investigating Companion Planting Relationships" |
| Academic Objective | Students analyze biotic interactions in garden ecosystems using evidence from controlled observations |
| SEL Objective | Students practice evidence-based reasoning and perspective-taking through collaborative inquiry |
| Root Opening | Silent garden observation (5 min); journal three things noticed |
| Core Activity | Investigate companion planting relationships using TRACE protocol; collect data, form hypotheses, design verification experiments |
| TRACE Integration | Full protocol with emphasis on VERIFY and GENERALIZE reasoning moves |
| Restore Bridge | Peer review of experimental designs with structured error analysis |
| Reconnect Closing | Connection to indigenous agricultural wisdom (Three Sisters planting) |
| Regulation Adaptations | Tier 20-39: Simplified observation sheet; paired with co-regulation partner. Tier 80-100: Independent research design with literature review |

## Customization Features

### Educator Modification Tools

After the AI generates a lesson plan, educators can:

| Feature | Description |
|---|---|
| Edit any section | Full text editing of all generated content |
| Swap activities | Replace suggested activities from the activity database |
| Adjust timing | Modify time allocations for each section |
| Add student-specific notes | Include individual student accommodations and notes |
| Save as template | Save modified plans as personal templates for future use |
| Share with PLC | Post plans to the Professional Learning Community library |
| Tag and organize | Apply custom tags for easy retrieval and organization |

### Context Learning

The AI improves over time by learning from educator modifications:

- **Pattern recognition** — Identifies common modifications by grade band, season, and school context
- **Preference learning** — Adapts to individual educator style and preferences
- **Feedback integration** — Incorporates post-lesson reflections to improve future suggestions
- **Community intelligence** — Aggregates anonymized modification patterns across all users to improve base recommendations

## Quality Assurance

### Alignment Verification

Every generated lesson plan is automatically checked against:

| Criterion | Verification Method |
|---|---|
| Standards alignment | Academic activities mapped to specific standard indicators |
| 5Rs fidelity | Each phase represented appropriately for the selected focus |
| Dual-purpose design | Every activity tagged with both academic and SEL objectives |
| TRACE integration | Protocol prompts embedded at appropriate cognitive demand points |
| Regulation differentiation | Adaptations provided for all five regulation tiers |
| Garden authenticity | Garden activities verified as seasonally appropriate and practically feasible |
| Trauma sensitivity | Language checked against trauma-informed communication guidelines |

### Educator Feedback Loop

After lesson delivery, educators can:
1. Rate the lesson plan's effectiveness (1-5 scale)
2. Note specific modifications made during delivery
3. Record student engagement and regulation observations
4. Suggest improvements for the lesson template
5. Share successful adaptations with the educator community

## Ethical Considerations

### What the AI Does NOT Do

- **Does not assess students** — Assessment remains the educator's professional responsibility
- **Does not determine regulation levels** — Regulation assessment requires human observation and judgment
- **Does not replace educator planning** — Generated plans are starting points, not finished products
- **Does not store student-identifiable data** — All AI processing uses anonymized context
- **Does not make disciplinary recommendations** — Behavioral responses are exclusively human decisions
- **Does not contact families** — All communication decisions and actions remain with the educator

### Transparency Commitment

- All AI-generated content is clearly labeled as such
- Educators can view the reasoning behind any suggestion
- The system explains which standards, activities, and strategies informed each recommendation
- Regular bias audits ensure equitable suggestions across student demographics
