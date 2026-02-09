---
title: "Digital Platform"
section: "Technology Integration"
source_path: "10-technology-integration/digital-platform.md"
document_type: "curriculum"
---
# Digital Platform

## Overview

RootGuide is the digital platform that powers the RootWork curriculum's technology ecosystem. Built to support trauma-informed, garden-based education at scale, RootGuide serves four distinct user groups -- students, educators, parents/guardians, and administrators -- through purpose-built interfaces that align with the 5Rs Framework. The platform is not a replacement for human connection; it is a tool that amplifies the educator's capacity to personalize instruction, track growth, and sustain the relational core of the curriculum.

RootGuide is built on a modern web architecture designed for reliability, accessibility, and security. The platform operates as a multi-tenant SaaS application, allowing multiple schools and districts to participate while maintaining strict data isolation between tenants.

## Platform Architecture

### Technical Foundation

- **Frontend:** Responsive web application (React/Next.js) optimized for desktop, tablet, and mobile
- **Backend:** Node.js API server with PostgreSQL database
- **AI Engine:** Claude-powered conversational AI for the student tutor and lesson plan generator
- **Hosting:** Cloud-hosted with SOC 2 Type II compliant infrastructure
- **Availability:** 99.9% uptime SLA with automated failover
- **Mobile:** Progressive Web App (PWA) with offline capability for garden use

### Multi-Tenant Architecture

Each school or district operates within an isolated tenant with:
- Separate data storage with encryption at rest and in transit
- Configurable branding (school logo, colors, custom welcome messages)
- Independent user management and role-based access control
- Customizable curriculum library with shared and local content
- Tenant-specific analytics and reporting

---

## Student-Facing Features

### AI Tutor (RootGuide Companion)

The AI tutor is the student's primary interface with the platform. Designed as a conversational learning partner, it facilitates the 5Rs Framework through natural dialogue.

**Core Capabilities:**
- **5Rs-Aligned Interactions:** Every tutoring session follows the 5Rs sequence. The AI begins with a Root check-in ("How are you feeling today?"), monitors regulation throughout, facilitates learning through the TRACE protocol during Reflect, supports error recovery in Restore, and closes with application in Reconnect.
- **TRACE Protocol Facilitation:** The AI uses the five TRACE moves (Think, Reason, Articulate, Check, Extend) to scaffold student thinking. It prompts reasoning moves, asks follow-up questions, and provides hints without giving away answers.
- **Adaptive Difficulty:** The AI adjusts problem difficulty based on student performance, maintaining challenge within the student's zone of proximal development.
- **Regulation Monitoring:** The AI detects potential dysregulation through response patterns (long pauses, error clusters, disengagement signals) and offers regulation strategies before proceeding.
- **Garden Metaphor Integration:** Learning concepts are connected to garden metaphors throughout the interaction.
- **Multimodal Input:** Students can type responses, use voice input, or upload photos (especially useful for garden documentation).

**Safety Protocols:**
- The AI never provides counseling or mental health advice
- Disclosure of harm or safety concerns triggers an immediate alert to the educator and school counselor
- All conversations are logged and reviewable by the educator
- Content is filtered for age-appropriateness based on grade band settings

### Growth Journal

A digital journal where students document their learning journey across academic and social-emotional domains.

**Features:**
- Daily reflection prompts aligned to the 5Rs
- Photo and video uploads from garden activities
- Text, drawing, and audio entry options (supporting diverse learners)
- Educator feedback and comments
- Connection to portfolio artifacts
- Private entries (visible only to student) and shared entries (visible to educator)

### Student Portfolio

A curated digital portfolio that showcases student growth over time.

**Features:**
- Artifact selection from journal entries, completed lessons, garden documentation, and assessment results
- Student-written reflections on selected artifacts
- Growth visualization showing progress across standards and competencies
- Shareable portfolio view for family conferences and celebrations
- Export option for transition between grade levels or schools

### Regulation Tools

A suite of digital regulation tools available to students at any time during platform use.

**Available Tools:**
- Guided breathing exercises with visual animations (flower breathing, square breathing, 4-7-8)
- Garden soundscapes for auditory grounding
- Regulation check-in slider ("How am I feeling right now?")
- Strategy suggestion engine based on student's regulation history
- Timer for self-directed regulation breaks
- Connection to the classroom regulation toolkit resources

---

## Educator-Facing Features

### Educator Dashboard

The central hub for classroom management, instruction, and data analysis.

**Dashboard Components:**
- **Class Overview:** At-a-glance view of all students showing regulation status, lesson progress, and flags for attention
- **Daily Planner:** Integrated calendar showing scheduled lessons, garden activities, and assessment windows
- **Notification Center:** Alerts for student regulation events, completion milestones, and system messages
- **Quick Actions:** One-click access to assign lessons, message students, generate reports, and launch the AI lesson plan generator

### Analytics and Data Visualization

Comprehensive analytics tools for data-informed instruction.

**Available Analytics:**
- **Academic Progress:** Standards mastery tracking by student, group, and class with trend lines
- **TRACE Engagement:** Metrics on reasoning move frequency, questioning depth, and discourse quality
- **Regulation Tracking:** Patterns in student regulation data over time, including triggers and effective strategies
- **Garden Activity Log:** Documentation of garden-based learning activities with standards alignment
- **Comparative Analytics:** Compare student, group, or class performance across time periods
- **Custom Reports:** Generate reports for PLCs, parent conferences, IEP meetings, and administrative reporting

### Curriculum Delivery

Tools for delivering and managing the RootWork curriculum.

**Features:**
- **Curriculum Library:** Browse, search, and assign lessons from the RootWork curriculum organized by grade band, content area, 5Rs phase, and garden season
- **Lesson Customization:** Modify existing lessons or create new ones using the lesson template builder
- **AI Lesson Plan Generator:** Generate new 5Rs-aligned lesson plans based on specified parameters (see AI Lesson Plan Generator documentation)
- **Assignment Management:** Assign lessons to individuals, groups, or the whole class with due dates and differentiation options
- **Pacing Guide:** Recommended lesson sequencing with flexibility to adjust based on student needs and garden calendar

### IEP Tracking and Support

Specialized features for supporting students with Individualized Education Programs.

**Features:**
- **IEP Goal Tracking:** Map IEP goals to RootWork competencies and track progress
- **Accommodation Reminders:** Automated reminders of student accommodations when assigning lessons
- **Modified Assessments:** Access to modified assessment versions aligned to IEP objectives
- **Progress Reports:** Generate IEP-compatible progress reports with RootWork-specific data
- **Related Service Integration:** Log and coordinate related service activities (speech, OT, counseling) with classroom instruction

---

## Parent-Facing Features

### Parent Portal

A dedicated interface for parents and guardians to stay connected to their child's learning.

**Features:**
- **Progress Dashboard:** Visual overview of child's academic progress, SEL growth, and garden participation
- **Portfolio View:** Access to the child's shared portfolio artifacts with reflection prompts for family discussion
- **Garden Updates:** Photos, videos, and descriptions of garden activities with suggestions for home extension
- **Communication Tools:** Secure messaging with the child's educator; notification preferences for progress updates
- **Resource Library:** Articles, videos, and guides on trauma-informed parenting, garden-based learning at home, and supporting student regulation
- **Event Calendar:** School garden events, family garden days, and parent workshop schedules

### Home-School Connection

**Features:**
- **Weekly Summary:** Automated weekly email or app notification summarizing the child's learning highlights
- **Home Garden Activities:** Suggested home garden activities that extend classroom learning
- **Family Cooking Connections:** Recipes using garden produce with embedded math and science learning
- **Multilingual Support:** Interface and communications available in English, Spanish, and additional languages based on school community needs

---

## Administrator Features

### Multi-Tenant Management

For district administrators overseeing multiple RootWork sites.

**Features:**
- **District Dashboard:** Aggregate data views across all schools with drill-down capability
- **School Comparison:** Compare implementation metrics, student outcomes, and engagement across sites
- **User Management:** Add, remove, and manage users across the district; role-based permissions
- **Content Management:** Distribute district-created content to school-level curriculum libraries
- **PD Tracking:** Monitor educator professional development hours, credential status, and coaching cycles

### Analytics and Compliance

**Features:**
- **Outcome Reporting:** Generate reports for school board presentations, grant reporting, and accountability requirements
- **Compliance Dashboard:** Monitor FERPA, COPPA, and ADA compliance across the platform
- **Usage Analytics:** Track platform adoption, engagement patterns, and feature utilization
- **Equity Analytics:** Disaggregate data by demographic groups to identify and address opportunity gaps
- **Export Tools:** Export data in standard formats (CSV, PDF) for integration with district reporting systems

---

## Accessibility Standards

RootGuide is designed and tested to meet **WCAG 2.1 Level AA** accessibility standards.

### Accessibility Features

- **Screen Reader Compatibility:** Full compatibility with JAWS, NVDA, and VoiceOver
- **Keyboard Navigation:** Complete keyboard accessibility for all platform features
- **Color Contrast:** Minimum 4.5:1 contrast ratio for all text; 3:1 for large text and UI components
- **Text Resizing:** Content remains functional and readable at 200% zoom
- **Alternative Text:** All images, charts, and visualizations include descriptive alt text
- **Captions and Transcripts:** All video content includes closed captions and downloadable transcripts
- **Reduced Motion:** Option to disable animations for users with vestibular sensitivities
- **Focus Indicators:** Visible focus indicators for all interactive elements
- **Error Identification:** Clear, descriptive error messages for form inputs and interactions
- **Multiple Input Methods:** Support for touch, keyboard, mouse, voice input, and switch access

### Accessibility Testing

- Automated testing using axe-core integrated into the CI/CD pipeline
- Manual testing with screen readers and assistive technology quarterly
- User testing with individuals with disabilities annually
- Accessibility audit by a third-party firm annually
- Bug bounty program for accessibility issues

---

## Data Privacy and Security

### FERPA Compliance

RootGuide complies with the Family Educational Rights and Privacy Act (FERPA):

- All student data is classified as educational records and protected accordingly
- Parents have the right to inspect, review, and request amendment of their child's records
- Student data is never shared with third parties without proper consent or legal authorization
- The platform maintains a detailed audit log of all data access
- Data retention and deletion policies comply with state and federal requirements

### COPPA Compliance

For students under 13, RootGuide complies with the Children's Online Privacy Protection Act (COPPA):

- Parental consent is obtained before collecting personal information from children under 13
- Data collection is limited to what is necessary for educational purposes
- No behavioral advertising or commercial data use
- Parents can review, delete, and refuse further collection of their child's data
- The AI tutor does not collect or store personal information beyond the educational interaction

### Security Measures

- **Encryption:** AES-256 encryption at rest; TLS 1.3 encryption in transit
- **Authentication:** Multi-factor authentication available for all user roles; SSO integration with school identity providers (Google Workspace, Microsoft Entra ID, Clever)
- **Access Control:** Role-based access control (RBAC) with principle of least privilege
- **Monitoring:** Real-time security monitoring and automated threat detection
- **Incident Response:** Documented incident response plan with 24-hour notification for data breaches
- **Penetration Testing:** Annual third-party penetration testing
- **Data Backup:** Automated daily backups with 30-day retention and geographic redundancy

---

## Integration with School Systems

### Student Information System (SIS) Integration

RootGuide integrates with major SIS platforms for automated data synchronization:

- **Supported Systems:** PowerSchool, Infinite Campus, Skyward, Tyler SIS
- **Data Sync:** Automated daily sync of student roster, enrollment, demographics, and schedule
- **One-Way and Two-Way Options:** Roster data flows from SIS to RootGuide; grade data can optionally flow back

### Learning Management System (LMS) Integration

RootGuide can operate standalone or integrate with existing LMS platforms:

- **Supported Systems:** Google Classroom, Canvas, Schoology
- **LTI Integration:** LTI 1.3 compliant for seamless embedding within existing LMS environments
- **Assignment Sync:** RootGuide assignments can appear in the LMS gradebook
- **Single Sign-On:** Students and educators access RootGuide through their existing LMS login

### Assessment Platform Integration

- **Supported Systems:** MAP Growth (NWEA), i-Ready, STAR (Renaissance)
- **Data Import:** Import external assessment data to enrich the RootGuide analytics dashboard
- **Correlation Analysis:** Compare RootWork engagement data with external assessment outcomes

### Rostering Standards

- **OneRoster 1.1:** Full compliance with the OneRoster standard for automated rostering
- **Clever Integration:** Supported for schools using Clever for application rostering
- **ClassLink Integration:** Supported for schools using ClassLink for single sign-on and rostering
