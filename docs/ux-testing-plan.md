# UX Testing Plan

This plan captures manual UX validation steps for local development and pre-release checks.

## Pre-testing setup

### 1) Start local development server

```bash
npm install
npm run dev
```

Access: `http://localhost:3000`

### 2) Seed test data (if database is empty)

```bash
npm run db:migrate
npm run db:seed
```

Expected seed entities:
- Demo School District
- Roosevelt Middle School
- Educator: Sarah Johnson
- Students: Alex Martinez, Jordan Lee, Taylor Smith
- Math standards and content

## User personas and test scenarios

### Persona 1: Student (Alex Martinez)

| Step | Action | Expected Result | ✅ |
|---|---|---|---|
| 1 | Visit home page (`/`) | RootWork branding, “Get Started” button, student workspace cards | ☐ |
| 2 | Click “Get Started” | Redirect to sign-up (`/sign-up`) | ☐ |
| 3 | Sign in with test credentials | Authenticated via Clerk | ☐ |
| 4 | Navigate to `/progress` | Progress dashboard with mastery levels | ☐ |
| 5 | Check Progress Summary | Total standards, average mastery, sessions visible | ☐ |
| 6 | View Reasoning Move Chart | Visualized thinking skills | ☐ |
| 7 | Check Bloom’s Taxonomy | Cognitive-level breakdown | ☐ |
| 8 | Export Progress | Export download succeeds | ☐ |
| 9 | Navigate to `/learn` | Learn page placeholder (Phase 2.1) | ☐ |
| 10 | Navigate to `/community` | Community placeholder appears | ☐ |

### Persona 2: Educator (Sarah Johnson)

| Step | Action | Expected Result | ✅ |
|---|---|---|---|
| 1 | Go to `/educator/dashboard` | Educator Workspace portal loads | ☐ |
| 2 | View educator nav items | All educator tools listed | ☐ |
| 3 | Go to `/educator/students` | Student roster page loads | ☐ |
| 4 | View student list | 3 seeded students + support tiers | ☐ |
| 5 | Check IEP badge | “Students with IEPs” count is accurate | ☐ |
| 6 | Filter by support tier | Tier filter works (Tier 1/2/3/All) | ☐ |
| 7 | Search by name | Dynamic filtering while typing | ☐ |
| 8 | Select student | Student detail panel appears | ☐ |
| 9 | View accommodations | Accommodation catalog visible | ☐ |
| 10 | Toggle accommodation | IEP state updates correctly | ☐ |
| 11 | Add new student | New student appears in list | ☐ |
| 12 | View student progress | Attendance % and progress metrics shown | ☐ |

### Persona 3: Parent/Guardian

| Step | Action | Expected Result | ✅ |
|---|---|---|---|
| 1 | Go to `/parent/dashboard` | Parent dashboard loads | ☐ |
| 2 | Go to `/parent/settings` | Settings placeholder loads | ☐ |
| 3 | Check notification controls | “Will appear here” placeholder text shown | ☐ |

### Persona 4: Admin

| Step | Action | Expected Result | ✅ |
|---|---|---|---|
| 1 | Go to `/admin/dashboard` | Admin portal loads | ☐ |
| 2 | Open compliance pages | Privacy + retention pages reachable | ☐ |
| 3 | Check `/privacy` | Privacy policy and data categories present | ☐ |
| 4 | Check `/data-retention` | Retention policy table renders | ☐ |

## Feature-specific tests

### Assessment system

Navigate to:

`http://localhost:3000/students/[studentId]/assessments`

| Feature | Test | Expected | ✅ |
|---|---|---|---|
| Tabs | Click Overview/History/Reasoning/New | Tab switches correctly | ☐ |
| Diagnostic Card | View count + “Start New” button | Completed count displayed | ☐ |
| Formative Card | View completed count | Integration note displayed | ☐ |
| Summative Card | View count + button | Mastery evaluations shown | ☐ |
| Assessment History | Open History tab | Past assessments listed | ☐ |
| Reasoning Tracker | Open Reasoning tab | Thinking-skills progress shown | ☐ |

### Progress tracking

| Component | Location | Test | ✅ |
|---|---|---|---|
| ProgressSummary | `/progress` | Total standards + mastery % visible | ☐ |
| MasteryByStandard | `/progress` | Standards with mastery bars | ☐ |
| SessionHistory | `/progress` | Recent tutoring sessions listed | ☐ |
| ReasoningMoveChart | `/progress` | Thinking skill usage visualized | ☐ |
| BloomsTaxonomy | `/progress` | Cognitive level breakdown shown | ☐ |
| ExportButton | `/progress` | Progress data downloads | ☐ |

### Authentication and authorization

| Test | Action | Expected | ✅ |
|---|---|---|---|
| Sign Up | Click “Get Started” | Clerk sign-up appears | ☐ |
| Sign In | Open protected route | Redirect to sign-in | ☐ |
| Sign Out | Click sign-out | Returns to home | ☐ |
| Profile | Open user profile | Clerk user data visible | ☐ |
| Role Check | Access educator as student | Denied/redirected | ☐ |

### Design system and UI

| Area | Test | Expected | ✅ |
|---|---|---|---|
| Branding | Home page logo/icon | Rootwork logo/icon renders | ☐ |
| Color System | Validate primary/secondary colors | Palette is consistent | ☐ |
| Typography | Validate heading/body hierarchy | Clear readability hierarchy | ☐ |
| Buttons | Hover/active states | Smooth transitions | ☐ |
| Cards | Border-radius/shadow consistency | Card style is consistent | ☐ |
| Navigation | Click all nav items | Smooth transitions | ☐ |
| Responsive | Resize viewport | Mobile-friendly layout | ☐ |
| Loading States | Navigate between pages | Loading indicators appear | ☐ |
| Error States | Trigger known errors | Graceful handling and messaging | ☐ |

## Technical tests

### Build and performance

```bash
npm run build
npm start
```

Checks:
- No TypeScript build errors
- No blocking console warnings
- Bundle size remains reasonable

### Database connectivity

```bash
npm run db:studio
```

Verify:
- Required tables exist
- Seed data is present
- Relations are correct

### API routes (example)

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $N8N_WEBHOOK_SECRET" \
  -d '{"source":"MANUAL","test":true}'
```

## UX metrics to track

| Metric | How to Test | Target |
|---|---|---|
| Page Load Time | Chrome DevTools Network | < 3s |
| Time to Interactive | Lighthouse audit | < 5s |
| Navigation Time | Click-through flow | < 1s per page |
| Form Completion | Add student / assessment flow | < 2 min |
| Error Recovery | Intentionally trigger errors | Clear guidance |
| Mobile Usability | Test tablet/phone breakpoints | Fully accessible |

## Bug tracking template

```markdown
## Bug Report

**Page:** /educator/students
**User Role:** Educator
**Browser:** Chrome 120
**Steps to Reproduce:**
1. Navigate to student roster
2. Click "Add Student"
3. Submit without name

**Expected:** Form validation error
**Actual:** Page crashes
**Severity:** High
**Screenshot:** [attach]
```

## Final checklist before production

- [ ] All authentication flows work
- [ ] Role-based pages are enforced
- [ ] Database operations succeed
- [ ] No console errors
- [ ] Responsive on mobile/tablet/desktop
- [ ] Loading states implemented
- [ ] Error handling is graceful
- [ ] Forms validate properly
- [ ] Navigation is intuitive
- [ ] Branding is consistent
- [ ] Performance acceptable (Lighthouse > 80)
- [ ] Accessibility checks pass (WCAG AA)

## Automated tests

```bash
npm test
npm run test:e2e
npm run lint
```
